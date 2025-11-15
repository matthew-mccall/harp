'use client';

import { useEffect, useRef, useState } from 'react';

export default function UserCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const EMOTION_BASE_URL = (typeof window !== 'undefined' && (process as any)?.env?.NEXT_PUBLIC_EMOTION_URL)
    || (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_EMOTION_URL : undefined)
    || 'http://localhost:3001';

  const startCamera = async () => {
    try {
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      console.log('Camera access granted', mediaStream);

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Ensure video plays
        await videoRef.current.play();
        console.log('Video playing');
      }

      // Start WebRTC publishing to harp-emotion server
      await startWebRTC(mediaStream);

      setIsCameraOn(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(`Failed to access camera: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsCameraOn(false);
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    // Close peer connection if any
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  const waitForIceGatheringComplete = (pc: RTCPeerConnection, timeoutMs = 3000) =>
    new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const onChange = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', onChange);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', onChange);
      setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }, timeoutMs);
    });

  const startWebRTC = async (mediaStream: MediaStream) => {
    // If there's already a peer connection, close it
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      console.log('[webrtc] iceConnectionState:', pc.iceConnectionState);
    };
    pc.onconnectionstatechange = () => {
      console.log('[webrtc] connectionState:', pc.connectionState);
    };

    // Add all tracks from the local camera to the peer connection
    for (const track of mediaStream.getTracks()) {
      pc.addTrack(track, mediaStream);
    }

    // Create and set local offer
    const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);

    // Wait for local ICE gathering so our offer includes candidates
    await waitForIceGatheringComplete(pc);

    const localDesc = pc.localDescription;
    if (!localDesc) throw new Error('Failed to get localDescription');

    // Send the offer to the harp-emotion server to get an answer
    const url = `${EMOTION_BASE_URL.replace(/\/$/, '')}/webrtc/offer`;
    console.log('[webrtc] Sending offer to', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: localDesc.type, sdp: localDesc.sdp }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Server responded ${res.status}: ${text}`);
    }
    const answer = await res.json();
    console.log('[webrtc] Received answer');
    await pc.setRemoteDescription(answer);

    // Done. The server is in recvonly and should log tracks.
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (pcRef.current) {
        try { pcRef.current.close(); } catch {}
        pcRef.current = null;
      }
    };
  }, [stream]);

  return (
    <div className="flex-1 bg-gradient-to-br from-black via-gray-950 to-black border-l border-white/10 overflow-hidden relative shadow-2xl shadow-white/5">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${isCameraOn ? 'block' : 'hidden'}`}
      />

      {!isCameraOn && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full border-2 border-white/20 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center shadow-inner">
              <svg
                className="w-8 h-8 text-white/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-400 max-w-xs">
              {error || 'Camera Off'}
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex gap-2 z-10">
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-lg text-xs shadow-lg">
          You
        </div>
        <button
          onClick={isCameraOn ? stopCamera : startCamera}
          className="bg-gradient-to-br from-white/10 to-white/5 hover:from-white hover:to-gray-100 hover:text-black backdrop-blur-md border border-white/30 hover:border-white px-4 py-1.5 rounded-lg text-xs transition-all duration-300 shadow-lg hover:shadow-white/20"
        >
          {isCameraOn ? '📹 On' : '📹 Off'}
        </button>
      </div>
    </div>
  );
}


