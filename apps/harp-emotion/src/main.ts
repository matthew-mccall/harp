import express from 'express';
import { Server } from 'socket.io'
import { createServer } from 'node:http';
import path from 'node:path';
import wrtc from '@roamhq/wrtc'
import cors, { CorsOptions } from 'cors';
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = wrtc;

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

    // Logging: when tracks are received
    pc.ontrack = (event: any) => {
      const track = event.track;
      if (track && track.kind === 'video') {
        const streamIds = (event.streams || []).map((s: any) => s.id);
        console.log(`[webrtc] received video track id=${track.id} streams=[${streamIds.join(',')}]`);
      }
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
