import express from 'express';
import { Server } from 'socket.io'
import { createServer } from 'node:http';
import path from 'node:path';
import wrtc from '@roamhq/wrtc'
import cors, { CorsOptions } from 'cors';
// TensorFlow.js (Node backend) and Face Detection model
import * as tf from '@tensorflow/tfjs-node';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { createDetector, SupportedModels, type FaceDetector } from '@tensorflow-models/face-detection';
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = wrtc;
const nonstandard: any = (wrtc as any).nonstandard || {};
const { RTCVideoSink } = nonstandard;

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

const app = express();
app.use(express.json({ limit: '2mb' }));

// CORS: allow only localhost origins
const isLocalhostOrigin = (origin?: string | null) => {
  if (!origin) return true; // allow same-origin or curl/no-origin
  try {
    const u = new URL(origin);
    return (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      (u.protocol === 'http:' || u.protocol === 'https:')
    );
  } catch {
    return false;
  }
};

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isLocalhostOrigin(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
} as const;

app.use(cors(corsOptions));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isLocalhostOrigin(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  },
});

const publicDir = path.resolve(__dirname, 'assets');
console.log(publicDir);
app.use(express.static(publicDir));

app.get('/api', (req, res) => {
  res.send({ message: 'Hello API' });
});

io.on('connection', (socket) => {
  console.log('a user connected');
});

// --- WebRTC receiver endpoint (server-side) ---
// Accepts an SDP offer from a remote peer and returns an SDP answer.
// Logs when the connection is established and when a video track is received.
app.post('/webrtc/offer', async (req, res) => {
  const defaultIceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  let iceServers = defaultIceServers;
  try {
    if (process.env.ICE_SERVERS) {
      const parsed = JSON.parse(process.env.ICE_SERVERS);
      if (Array.isArray(parsed)) iceServers = parsed;
    }
  } catch {
    // ignore malformed env, fall back to default
  }

  const config = { iceServers } as any;

  try {
    const body = req.body ?? {};
    const offer: { type: 'offer'; sdp: string } = body; // minimal shape

    if (!offer || offer.type !== 'offer' || !offer.sdp) {
      res.status(400).json({ error: 'Body must be an RTCSessionDescriptionInit offer { type: "offer", sdp: "..." }' });
      return;
    }

    const pc = new RTCPeerConnection(config);

    // We receive only; advertise that in the SDP
    try {
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
    } catch {
      // older versions may not support adding transceivers before setRemoteDescription; safe to ignore
    }

    // Logging: connection state
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[webrtc] connection state: ${state} from ${req.ip}`);
      if (state === 'connected') {
        console.log(`[webrtc] connected at ${new Date().toISOString()} from ${req.ip}`);
      }
    };

    // Logging and Face Detection: when video tracks are received
    pc.ontrack = (event: any) => {
      const track: any = event?.track;
      if (!track) return;
      if (track.kind !== 'video') return;

      const streamIds = (event.streams || []).map((s: any) => s.id);
      console.log(`[webrtc] received video track id=${track.id} streams=[${streamIds.join(',')}]`);

      // Attach a video sink if supported by wrtc
      if (!RTCVideoSink) {
        console.warn('[webrtc] RTCVideoSink not available in this wrtc build; face detection disabled');
        return;
      }

      const sink = new RTCVideoSink(track as any);
      let lastProcessTs = 0;
      let hadFace = false; // track-level state to detect new face appearance
      let closed = false;

      // Ensure detector is ready (lazy-init singleton)
      getFaceDetector().catch((e) => {
        console.error('[face] failed to init detector:', e);
      });

      const onFrame = async ({ frame }: any) => {
        if (closed || !frame) return;
        const now = Date.now();
        // Throttle to ~5 FPS
        if (now - lastProcessTs < 200) return;
        lastProcessTs = now;

        try {
          const { width, height } = frame;
          const data: Uint8Array | Buffer | undefined =
            (frame?.i420 as Uint8Array | undefined) ||
            (frame?.data as Uint8Array | undefined) ||
            (frame?.buffer as Uint8Array | undefined);
          if (!width || !height || !data) return;

          const rgb = i420ToRgb(data, width, height);
          // Create tensor [H,W,3] int32 so values 0..255 are preserved
          const input = tf.tensor3d(rgb, [height, width, 3], 'int32');
          let faces: any[] = [];
          try {
            const detector = await getFaceDetector();
            faces = await detector.estimateFaces(input as any, { flipHorizontal: false });
          } finally {
            input.dispose();
          }

          const count = Array.isArray(faces) ? faces.length : 0;
          if (!hadFace && count > 0) {
            hadFace = true;
            console.log(`[face] new face detected on track=${track.id} at ${new Date().toISOString()} (faces=${count})`);
          } else if (count === 0) {
            // Reset when no faces so we can detect a new appearance later
            hadFace = false;
          }
        } catch (err) {
          // Keep errors noisy but non-fatal
          console.warn('[face] frame processing error:', (err as any)?.message || err);
        }
      };

      sink.addEventListener?.('frame', onFrame);
      // node-webrtc also supports assigning callback directly
      if ((sink as any).onframe === undefined) {
        (sink as any).onframe = onFrame;
      }

      const cleanup = () => {
        if (closed) return;
        closed = true;
        try { sink.stop?.(); } catch {}
        try { (sink as any).onframe = undefined; } catch {}
      };

      // Clean up when track ends or pc closes
      track.addEventListener?.('ended', cleanup);
      pc.addEventListener?.('connectionstatechange', () => {
        const s = pc.connectionState;
        if (s === 'closed' || s === 'failed' || s === 'disconnected') cleanup();
      });
    };

    // Some senders may include separate trickle candidates in the payload
    if (Array.isArray(body.iceCandidates)) {
      for (const c of body.iceCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.warn('[webrtc] failed to add remote ICE candidate', e);
        }
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait for ICE gathering to complete so the answer contains candidates
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
      // Safety timeout
      setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }, 3000);
    });

    const localDesc = pc.localDescription;
    if (!localDesc) {
      res.status(500).json({ error: 'Failed to create local description' });
      try { pc.close(); } catch {}
      return;
    }

    res.json({ type: localDesc.type, sdp: localDesc.sdp });

    // Optional: close the peer after a period if it never connects
    const timeout = setTimeout(() => {
      try { pc.close(); } catch {}
    }, 5 * 60_000);
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[webrtc] connection state: ${state} from ${req.ip}`);
      if (state === 'connected') {
        console.log(`[webrtc] connected at ${new Date().toISOString()} from ${req.ip}`);
        clearTimeout(timeout);
      }
      if (state === 'closed' || state === 'failed' || state === 'disconnected') {
        clearTimeout(timeout);
        try { pc.close(); } catch {}
      }
    };
  } catch (err: any) {
    console.error('[webrtc] error handling offer:', err?.message || err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start HTTP server (and Socket.IO if used)
server.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});

// --- Face Detection Utilities ---
let detectorPromise: Promise<FaceDetector> | null = null;
async function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        // Prefer CPU backend for broader kernel coverage (e.g., 'Transform' op)
        await tf.setBackend('cpu');
      } catch {
        // Fallback to whatever backend is available
      }
      await tf.ready();
      try {
        console.log('[face] tfjs backend:', tf.getBackend());
      } catch {}
      const detector = await createDetector(SupportedModels.MediaPipeFaceDetector, {
        runtime: 'tfjs',
      } as any);
      return detector;
    })();
  }
  return detectorPromise;
}

function clampToByte(x: number): number {
  return x < 0 ? 0 : x > 255 ? 255 : x | 0;
}

// Convert I420 (YUV420 planar) frame to RGB uint8 array
function i420ToRgb(yuv: Uint8Array | Buffer, width: number, height: number): Uint8Array {
  const Ysize = width * height;
  const Usize = (width >> 1) * (height >> 1);
  const Vsize = Usize;
  const Y = yuv.subarray(0, Ysize);
  const U = yuv.subarray(Ysize, Ysize + Usize);
  const V = yuv.subarray(Ysize + Usize, Ysize + Usize + Vsize);
  const rgb = new Uint8Array(width * height * 3);

  let p = 0;
  for (let y = 0; y < height; y++) {
    const yRow = y * width;
    const uvRow = (y >> 1) * (width >> 1);
    for (let x = 0; x < width; x++) {
      const yVal = Y[yRow + x];
      const uvIdx = uvRow + (x >> 1);
      const uVal = U[uvIdx];
      const vVal = V[uvIdx];

      // YUV -> RGB conversion (BT.601)
      const C = yVal - 16;
      const D = uVal - 128;
      const E = vVal - 128;
      // Using integer math approximation
      let R = (298 * C + 409 * E + 128) >> 8;
      let G = (298 * C - 100 * D - 208 * E + 128) >> 8;
      let B = (298 * C + 516 * D + 128) >> 8;

      rgb[p++] = clampToByte(R);
      rgb[p++] = clampToByte(G);
      rgb[p++] = clampToByte(B);
    }
  }
  return rgb;
}
