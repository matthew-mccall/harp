import express from 'express';
import { Server } from 'socket.io'
import { createServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
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

// --- Emotion model config ---
const EMOTION_LABELS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral'] as const;
const IMAGE_SIZE = 48; // model expects 48x48 grayscale

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
          const frameTensor = tf.tensor3d(rgb, [height, width, 3], 'int32');
          let faces: any[] = [];
          try {
            const detector = await getFaceDetector();
            faces = await detector.estimateFaces(frameTensor as any, { flipHorizontal: false });
          } catch (e) {
            // ignore
          }

          const count = Array.isArray(faces) ? faces.length : 0;
          if (!hadFace && count > 0) {
            hadFace = true;
            console.log(`[face] new face detected on track=${track.id} at ${new Date().toISOString()} (faces=${count})`);
          } else if (count === 0) {
            // Reset when no faces so we can detect a new appearance later
            hadFace = false;
          }

          if (count > 0) {
            // Run emotion recognition on each detected face
            try {
              const results = await inferEmotionsOnFaces(frameTensor, faces, width, height);

              if (results.length === 0) {
                console.log(
                  `[emotion] no faces detected on track=${track.id} at ${new Date().toISOString()} (faces=${count})`
                )
              }

              for (const r of results) {
                const payload = {
                  trackId: track.id,
                  ts: Date.now(),
                  box: r.box,
                  dominantEmotion: r.dominantEmotion,
                  emotions: r.emotions,
                };
                // Broadcast to all clients and log to console
                io.emit('emotion', payload);
                const dom = r.dominantEmotion;
                console.log(`[emotion] ${dom.emotion} ${(dom.probability * 100).toFixed(1)}% @ box(${Math.round(r.box.x)},${Math.round(r.box.y)},${Math.round(r.box.width)}x${Math.round(r.box.height)})`);
              }
            } catch (e) {
              console.warn('[emotion] inference error:', (e as any)?.message || e);
            } finally {
              // Dispose the frame tensor after we're done
              frameTensor.dispose();
            }
          } else {
            // No faces: dispose the frame tensor
            frameTensor.dispose();
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

// Startup: load the emotion model first, then start accepting connections
async function bootstrap() {
  try {
    console.log('[startup] initializing TensorFlow...');
    await tf.ready();
    try {
      console.log('[startup] tfjs backend:', tf.getBackend());
    } catch {}

    console.log('[startup] loading emotion model...');
    const t0 = Date.now();
    const model = await getEmotionModel();

    // Optional warm-up to reduce first-inference latency
    try {
      const warm = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 1]);
      const out = model.predict(warm) as tf.Tensor;
      await out.data();
      warm.dispose();
      out.dispose();
    } catch {}

    console.log(`[startup] emotion model loaded in ${Date.now() - t0} ms`);

    server.listen(port, host, () => {
      console.log(`[ ready ] http://${host}:${port}`);
    });
  } catch (err) {
    console.error('[startup] failed to initialize:', (err as any)?.message || err);
    process.exit(1);
  }
}

bootstrap();

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

// --- Emotion Recognition Utilities ---
let emotionModelPromise: Promise<tf.LayersModel> | null = null;
async function getEmotionModel(): Promise<tf.LayersModel> {
  if (!emotionModelPromise) {
    emotionModelPromise = (async () => {
      // Resolve model.json path from multiple candidates
      const candidates = [
        path.resolve(__dirname, '../../../assets/face_emotion_model_browser/model.json'),
        path.resolve(process.cwd(), 'assets/face_emotion_model_browser/model.json'),
        path.resolve(__dirname, 'assets/face_emotion_model_browser/model.json'),
      ];
      let modelJsonPath: string | null = null;
      for (const p of candidates) {
        try {
          if (fs.existsSync(p)) { modelJsonPath = p; break; }
        } catch {}
      }
      if (!modelJsonPath) {
        throw new Error('Emotion model not found. Expected at one of: ' + candidates.join(', '));
      }
      const url = `file://${modelJsonPath}`;
      const model = await tf.loadLayersModel(url);
      return model;
    })();
  }
  return emotionModelPromise;
}

type FaceBox = { x: number; y: number; width: number; height: number };

function toFaceBox(face: any): FaceBox | null {
  // Support various detectors shapes
  if (face) {
    // MediaPipeFaceDetector style: face.box with xMin,yMin,width,height in px
    const b = face.box;
    if (b && typeof b.xMin === 'number' && typeof b.yMin === 'number') {
      const w = typeof b.width === 'number' ? b.width : (b.xMax - b.xMin);
      const h = typeof b.height === 'number' ? b.height : (b.yMax - b.yMin);
      return { x: b.xMin, y: b.yMin, width: w, height: h };
    }
    // BlazeFace style: topLeft/bottomRight arrays in px
    if (Array.isArray(face.topLeft) && Array.isArray(face.bottomRight)) {
      const [x1, y1] = face.topLeft;
      const [x2, y2] = face.bottomRight;
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    }
  }
  return null;
}

function normalizeBox(box: FaceBox, frameWidth: number, frameHeight: number, margin = 0.03) {
  const x1 = Math.max(0, box.x - box.width * margin);
  const y1 = Math.max(0, box.y - box.height * margin);
  const x2 = Math.min(frameWidth, box.x + box.width * (1 + margin));
  const y2 = Math.min(frameHeight, box.y + box.height * (1 + margin));
  // Return in [y1, x1, y2, x2] normalized (y by height, x by width)
  return [
    y1 / frameHeight,
    x1 / frameWidth,
    y2 / frameHeight,
    x2 / frameWidth,
  ] as [number, number, number, number];
}

async function inferEmotionsOnFaces(frameTensor: tf.Tensor3D, faces: any[], frameWidth: number, frameHeight: number) {
  if (!faces || faces.length === 0) return [] as any[];
  const boxesPx: FaceBox[] = [];
  const boxesNorm: Array<[number, number, number, number]> = [];
  for (const f of faces) {
    const fb = toFaceBox(f);
    if (!fb) continue;
    boxesPx.push(fb);
    boxesNorm.push(normalizeBox(fb, frameWidth, frameHeight));
  }
  if (boxesNorm.length === 0) return [] as any[];

  // Manually manage tensors (avoid async inside tf.tidy)
  // Ensure strong typings for TS: cropAndResize expects Tensor4D input
  const batched = frameTensor.expandDims(0) as tf.Tensor4D; // [1,H,W,3]
  const boxesTensor = tf.tensor2d(boxesNorm, [boxesNorm.length, 4]) as tf.Tensor2D;
  const boxInd = tf.tensor1d(new Array(boxesNorm.length).fill(0), 'int32') as tf.Tensor1D;
  const crops = tf.image.cropAndResize(batched, boxesTensor, boxInd, [IMAGE_SIZE, IMAGE_SIZE]); // [N,48,48,3]
  const gray = crops.mean(3).expandDims(-1); // [N,48,48,1]
  const input = gray.toFloat().div(255);
  const model = await getEmotionModel();
  const pred = model.predict(input) as tf.Tensor;
  const results = await pred.array() as number[][];
  // Cleanup intermediate tensors
  batched.dispose();
  boxesTensor.dispose();
  boxInd.dispose();
  crops.dispose();
  gray.dispose();
  input.dispose();
  pred.dispose();

  const out: any[] = [];
  for (let i = 0; i < results.length; i++) {
    const probs = results[i];
    const sum = probs.reduce((a, b) => a + (isFinite(b) ? Math.max(0, b) : 0), 0) || 1;
    const norm = probs.map((p) => Math.max(0, p) / sum);
    const emotions = EMOTION_LABELS.map((emotion, idx) => ({ emotion, probability: norm[idx] ?? 0 }));
    const dominantEmotion = emotions.reduce((m, c) => (c.probability > m.probability ? c : m), emotions[0]);
    out.push({ box: boxesPx[i], emotions, dominantEmotion });
  }
  return out;
}
