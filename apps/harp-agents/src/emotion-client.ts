/*
  Socket.IO client for consuming emotion broadcasts from harp-emotion.
  Keeps a module-level global of the current dominant emotion and last payload.
*/

import { io, type Socket } from 'socket.io-client';

// Mirror the emotion labels from harp-emotion
export type EmotionLabel = 'Angry' | 'Disgust' | 'Fear' | 'Happy' | 'Sad' | 'Surprise' | 'Neutral';

export type EmotionScore = {
  emotion: EmotionLabel;
  probability: number; // 0..1
};

export type EmotionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EmotionEventPayload = {
  trackId: string;
  ts: number; // epoch ms
  box: EmotionBox;
  dominantEmotion: EmotionScore;
  emotions: EmotionScore[];
};

let socketRef: Socket | null = null;

// Module-level globals updated on every broadcast
let CURRENT_EMOTION: EmotionLabel | null = null;
let LAST_EMOTION_PAYLOAD: EmotionEventPayload | null = null;

export function getCurrentEmotion(): EmotionLabel | null {
  return CURRENT_EMOTION;
}

export function getLastEmotionPayload(): EmotionEventPayload | null {
  return LAST_EMOTION_PAYLOAD;
}

export function initEmotionSocket(url: string): Socket {
  if (socketRef) return socketRef;

  const socket = io(url, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log(`[emotion] connected to ${url} (id=${socket.id})`);
  });

  socket.on('disconnect', (reason) => {
    // eslint-disable-next-line no-console
    console.log(`[emotion] disconnected: ${reason}`);
  });

  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('[emotion] connect_error:', (err as any)?.message || err);
  });

  socket.on('emotion', (payload: EmotionEventPayload) => {
    try {
      LAST_EMOTION_PAYLOAD = payload;
      CURRENT_EMOTION = payload?.dominantEmotion?.emotion ?? null;
      // eslint-disable-next-line no-console
      console.log(`[emotion] now=${CURRENT_EMOTION ?? 'n/a'} p=${(payload?.dominantEmotion?.probability ?? 0).toFixed(2)}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[emotion] failed to handle payload:', (e as any)?.message || e);
    }
  });

  socketRef = socket;
  return socket;
}
