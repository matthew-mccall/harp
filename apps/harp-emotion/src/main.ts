import express from 'express';
import { Server } from 'socket.io'
import { createServer } from 'node:http';
import path from 'node:path';
import cors, { CorsOptions } from 'cors';
// Emotion recognition utilities
import { getFaceDetector, inferEmotionsOnFaces, initializeEmotionEngine, tensorFromRgb } from './emotion-recognizer';
import { createWebRtcOfferHandler } from './wrtc-video-sink';

// --- App config ---

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

// Track state: remember if a face has been seen per track
const hadFace = new Map<string, boolean>();

// --- WebRTC receiver endpoint delegated to wrtc-video-sink ---
app.post('/webrtc/offer', createWebRtcOfferHandler({
  throttleMs: 200,
  onTrackStart: ({ track }) => {
    const id = (track as any).id ?? String(track);
    hadFace.set(id, false);
  },
  onTrackEnd: ({ track }) => {
    const id = (track as any).id ?? String(track);
    hadFace.delete(id);
  },
  onVideoFrame: async ({ rgb, width, height, track }) => {
    try {
      // Create tensor [H,W,3] int32 so values 0..255 are preserved
      const frameTensor = tensorFromRgb(rgb, width, height);
      let faces: any[] = [];
      try {
        const detector = await getFaceDetector();
        faces = await (detector as any).estimateFaces(frameTensor as any, { flipHorizontal: false });
      } catch {
        // ignore detection failures for this frame
      }

      const count = Array.isArray(faces) ? faces.length : 0;
      const id = (track as any).id ?? 'unknown';
      const seen = hadFace.get(id) || false;
      if (!seen && count > 0) {
        hadFace.set(id, true);
        console.log(`[face] new face detected on track=${id} at ${new Date().toISOString()} (faces=${count})`);
      } else if (count === 0) {
        hadFace.set(id, false);
      }

      if (count > 0) {
        try {
          const results = await inferEmotionsOnFaces(frameTensor, faces, width, height);
          if (results.length === 0) {
            console.log(`[emotion] no faces detected on track=${id} at ${new Date().toISOString()} (faces=${count})`);
          }
          for (const r of results) {
            const payload = {
              trackId: id,
              ts: Date.now(),
              box: r.box,
              dominantEmotion: r.dominantEmotion,
              emotions: r.emotions,
            };
            io.emit('emotion', payload);
            const dom = r.dominantEmotion;
            console.log(
              `[emotion] ${dom.emotion} ${(dom.probability * 100).toFixed(1)}% @ box(${Math.round(r.box.x)},${Math.round(r.box.y)},${Math.round(r.box.width)}x${Math.round(r.box.height)})`
            );
          }
        } catch (e) {
          console.warn('[emotion] inference error:', (e as any)?.message || e);
        } finally {
          frameTensor.dispose();
        }
      } else {
        frameTensor.dispose();
      }
    } catch (err) {
      console.warn('[face] frame processing error:', (err as any)?.message || err);
    }
  },
}));

// Startup: initialize the emotion engine first, then start accepting connections
async function bootstrap() {
  try {
    await initializeEmotionEngine();

    server.listen(port, host, () => {
      console.log(`[ ready ] http://${host}:${port}`);
    });
  } catch (err) {
    console.error('[startup] failed to initialize:', (err as any)?.message || err);
    process.exit(1);
  }
}

bootstrap();
