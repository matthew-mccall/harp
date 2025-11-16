import * as tf from '@tensorflow/tfjs-node';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import fs from 'node:fs';
import path from 'node:path';
import { createDetector, SupportedModels, type FaceDetector } from '@tensorflow-models/face-detection';

// --- Public config/constants ---
export const EMOTION_LABELS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral'] as const;
export const IMAGE_SIZE = 48; // model expects 48x48 grayscale

// --- Internal singletons ---
let detectorPromise: Promise<FaceDetector> | null = null;
let emotionModelPromise: Promise<tf.LayersModel> | null = null;

// Initialize TF and log backend once
async function ensureTFReady() {
  try {
    // Prefer CPU backend for broader kernel coverage on Node
    await tf.setBackend('cpu');
  } catch {
    // ignore, fallback to default
  }
  await tf.ready();
  try {
    console.log('[tfjs] backend:', tf.getBackend());
  } catch {}
}

// --- Public API ---
export async function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await ensureTFReady();
      const detector = await createDetector(SupportedModels.MediaPipeFaceDetector, { runtime: 'tfjs' } as any);
      return detector;
    })();
  }
  return detectorPromise;
}

export async function getEmotionModel(): Promise<tf.LayersModel> {
  if (!emotionModelPromise) {
    emotionModelPromise = (async () => {
      await ensureTFReady();
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

// Convenience: create Tensor3D from packed RGB bytes [H*W*3]
export function tensorFromRgb(rgb: Uint8Array, width: number, height: number) {
  return tf.tensor3d(rgb, [height, width, 3], 'int32');
}

type FaceBox = { x: number; y: number; width: number; height: number };

function toFaceBox(face: any): FaceBox | null {
  if (face) {
    const b = face.box;
    if (b && typeof b.xMin === 'number' && typeof b.yMin === 'number') {
      const w = typeof b.width === 'number' ? b.width : (b.xMax - b.xMin);
      const h = typeof b.height === 'number' ? b.height : (b.yMax - b.yMin);
      return { x: b.xMin, y: b.yMin, width: w, height: h };
    }
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
  return [
    y1 / frameHeight,
    x1 / frameWidth,
    y2 / frameHeight,
    x2 / frameWidth,
  ] as [number, number, number, number];
}

export async function inferEmotionsOnFaces(frameTensor: tf.Tensor3D, faces: any[], frameWidth: number, frameHeight: number) {
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

  const batched = frameTensor.expandDims(0) as tf.Tensor4D; // [1,H,W,3]
  const boxesTensor = tf.tensor2d(boxesNorm, [boxesNorm.length, 4]) as tf.Tensor2D;
  const boxInd = tf.tensor1d(new Array(boxesNorm.length).fill(0), 'int32') as tf.Tensor1D;
  const crops = tf.image.cropAndResize(batched, boxesTensor, boxInd, [IMAGE_SIZE, IMAGE_SIZE]); // [N,48,48,3]
  const gray = crops.mean(3).expandDims(-1); // [N,48,48,1]
  const input = gray.toFloat().div(255);
  const model = await getEmotionModel();
  const pred = model.predict(input) as tf.Tensor;
  const results = await pred.array() as number[][];
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

// Optional: one-call initialization to be used at startup
export async function initializeEmotionEngine() {
  console.log('[startup] initializing TensorFlow and loading emotion model...');
  const t0 = Date.now();
  await ensureTFReady();
  const model = await getEmotionModel();
  try {
    const warm = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 1]);
    const out = model.predict(warm) as tf.Tensor;
    await out.data();
    warm.dispose();
    out.dispose();
  } catch {}
  console.log(`[startup] emotion model ready in ${Date.now() - t0} ms`);
}
