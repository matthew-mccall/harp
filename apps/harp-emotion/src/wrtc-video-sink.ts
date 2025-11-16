import wrtc from '@roamhq/wrtc';

const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = wrtc as any;
const nonstandard: any = (wrtc as any).nonstandard || {};
const { RTCVideoSink } = nonstandard;

export type IceServer = { urls: string | string[]; username?: string; credential?: string };

export type VideoFrameEvent = {
  width: number;
  height: number;
  rgb: Uint8Array; // packed RGB length = width * height * 3
  track: any; // MediaStreamTrack from node-webrtc
  now: number;
};

export type TrackContext = {
  track: any; // MediaStreamTrack from node-webrtc
  pc: typeof RTCPeerConnection;
  req?: any; // Express Request (opaque type here)
};

export type CreateOfferHandlerOptions = {
  iceServers?: IceServer[];
  throttleMs?: number; // default 200ms (~5fps)
  onVideoFrame: (evt: VideoFrameEvent) => void | Promise<void>;
  onTrackStart?: (ctx: TrackContext) => void | Promise<void>;
  onTrackEnd?: (ctx: TrackContext) => void | Promise<void>;
};

// Utilities: color conversion
function clampToByte(x: number): number {
  return x < 0 ? 0 : x > 255 ? 255 : (x | 0);
}

// Convert I420 (YUV420 planar) frame to RGB uint8 array
export function i420ToRgb(yuv: Uint8Array | Buffer, width: number, height: number): Uint8Array {
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

// High-level WebRTC handler that accepts an SDP offer and returns an SDP answer,
// wiring RTCVideoSink to deliver RGB frames via onVideoFrame callback.
export function createWebRtcOfferHandler(options: CreateOfferHandlerOptions) {
  const throttleMs = Math.max(0, options.throttleMs ?? 200);

  return async function webrtcOfferHandler(req: any, res: any) {
    const defaultIceServers: IceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
    let iceServers: IceServer[] = options.iceServers || defaultIceServers;
    try {
      if (process.env.ICE_SERVERS) {
        const parsed = JSON.parse(process.env.ICE_SERVERS);
        if (Array.isArray(parsed)) iceServers = parsed;
      }
    } catch {
      // ignore malformed env, fall back to provided/default
    }

    const config: any = { iceServers };

    try {
      const body = req.body ?? {};
      const offer: { type: 'offer'; sdp: string } = body;
      if (!offer || offer.type !== 'offer' || !offer.sdp) {
        res.status(400).json({ error: 'Body must be an RTCSessionDescriptionInit offer { type: "offer", sdp: "..." }' });
        return;
      }

      const pc: typeof RTCPeerConnection = new (RTCPeerConnection as any)(config);

      // Receive-only transceivers
      try {
        (pc as any).addTransceiver('video', { direction: 'recvonly' });
        (pc as any).addTransceiver('audio', { direction: 'recvonly' });
      } catch {
        // safe to ignore
      }

      // Logging connection state
      (pc as any).onconnectionstatechange = () => {
        const state = (pc as any).connectionState;
        console.log(`[webrtc] connection state: ${state} from ${req.ip}`);
        if (state === 'connected') {
          console.log(`[webrtc] connected at ${new Date().toISOString()} from ${req.ip}`);
        }
      };

      // Track handler
      (pc as any).ontrack = (event: any) => {
        const track: any | undefined = event?.track;
        if (!track || track.kind !== 'video') return;

        const streamIds = (event.streams || []).map((s: any) => s.id);
        console.log(`[webrtc] received video track id=${(track as any).id} streams=[${streamIds.join(',')}]`);

        if (!RTCVideoSink) {
          console.warn('[webrtc] RTCVideoSink not available in this wrtc build; frame processing disabled');
          return;
        }

        const sink = new (RTCVideoSink as any)(track as any);
        let lastProcessTs = 0;
        let closed = false;

        const onFrame = async ({ frame }: any) => {
          if (closed || !frame) return;
          const now = Date.now();
          if (now - lastProcessTs < throttleMs) return;
          lastProcessTs = now;

          try {
            const { width, height } = frame;
            const data: Uint8Array | Buffer | undefined =
              (frame?.i420 as Uint8Array | undefined) ||
              (frame?.data as Uint8Array | undefined) ||
              (frame?.buffer as Uint8Array | undefined);
            if (!width || !height || !data) return;

            const rgb = i420ToRgb(data, width, height);
            await options.onVideoFrame({ width, height, rgb, track, now });
          } catch (err) {
            console.warn('[webrtc] frame processing error:', (err as any)?.message || err);
          }
        };

        if (options.onTrackStart) {
          try { options.onTrackStart({ track, pc, req }); } catch {}
        }

        // Bind frame events
        (sink as any).addEventListener?.('frame', onFrame);
        if ((sink as any).onframe === undefined) {
          (sink as any).onframe = onFrame;
        }

        const cleanup = () => {
          if (closed) return;
          closed = true;
          try { (sink as any).stop?.(); } catch {}
          try { (sink as any).onframe = undefined; } catch {}
          if (options.onTrackEnd) {
            try { options.onTrackEnd({ track, pc, req }); } catch {}
          }
        };

        (track as any).addEventListener?.('ended', cleanup);
        (pc as any).addEventListener?.('connectionstatechange', () => {
          const s = (pc as any).connectionState;
          if (s === 'closed' || s === 'failed' || s === 'disconnected') cleanup();
        });
      };

      // Optional remote trickle ICE candidates
      if (Array.isArray((req.body || {}).iceCandidates)) {
        for (const c of req.body.iceCandidates) {
          try {
            await (pc as any).addIceCandidate(new (RTCIceCandidate as any)(c));
          } catch (e) {
            console.warn('[webrtc] failed to add remote ICE candidate', e);
          }
        }
      }

      await (pc as any).setRemoteDescription(new (RTCSessionDescription as any)(offer));

      const answer = await (pc as any).createAnswer();
      await (pc as any).setLocalDescription(answer);

      // Wait ICE gathering complete so answer contains candidates
      await new Promise<void>((resolve) => {
        if ((pc as any).iceGatheringState === 'complete') return resolve();
        const check = () => {
          if ((pc as any).iceGatheringState === 'complete') {
            (pc as any).removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        (pc as any).addEventListener('icegatheringstatechange', check);
        setTimeout(() => {
          try { (pc as any).removeEventListener('icegatheringstatechange', check); } catch {}
          resolve();
        }, 3000);
      });

      const localDesc = (pc as any).localDescription;
      if (!localDesc) {
        res.status(500).json({ error: 'Failed to create local description' });
        try { (pc as any).close(); } catch {}
        return;
      }

      res.json({ type: localDesc.type, sdp: localDesc.sdp });

      // Optional: close peer after timeout if it never connects
      const timeout = setTimeout(() => {
        try { (pc as any).close(); } catch {}
      }, 5 * 60_000);
      (pc as any).onconnectionstatechange = () => {
        const state = (pc as any).connectionState;
        console.log(`[webrtc] connection state: ${state} from ${req.ip}`);
        if (state === 'connected') {
          console.log(`[webrtc] connected at ${new Date().toISOString()} from ${req.ip}`);
          clearTimeout(timeout);
        }
        if (state === 'closed' || state === 'failed' || state === 'disconnected') {
          clearTimeout(timeout);
          try { (pc as any).close(); } catch {}
        }
      };
    } catch (err: any) {
      console.error('[webrtc] error handling offer:', err?.message || err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
