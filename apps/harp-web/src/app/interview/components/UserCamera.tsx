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
    <div className="flex-1 bg-black overflow-hidden relative border-l-2 border-green-400/30 crt-screen" style={{ boxShadow: '0 0 20px rgba(0, 255, 0, 0.1)' }}>
      {/* Retro corner indicators */}
      <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-green-400/50" />
      <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-green-400/50" />
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover -scale-x-100 ${isCameraOn ? 'block' : 'hidden'}`}
      />

      {!isCameraOn && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {/* Retro icon */}
            <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center border-2 border-green-400/30 bg-black" style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)' }}>
              <svg
                className="w-8 h-8 text-green-400/70"
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
            <p className="text-xs text-green-400/60 font-mono max-w-xs">
              {error || '&gt; CAMERA_OFFLINE'}
            </p>
          </div>
        </div>
      )}

      {/* Retro controls */}
      <div className="absolute bottom-4 left-4 flex gap-3 z-10 items-center">
        <span className="text-xs font-mono tracking-widest uppercase text-cyan-400 border-2 border-cyan-400/50 bg-black px-2 py-1">
          [USER]
        </span>
        <button
          onClick={isCameraOn ? stopCamera : startCamera}
          className={`px-4 py-1.5 text-xs font-mono font-bold tracking-wider transition-all border-2 ${
            isCameraOn 
              ? 'bg-green-400 text-black border-green-400' 
              : 'bg-black text-green-400 border-green-400/50 hover:border-green-400'
          }`}
          style={isCameraOn ? { boxShadow: '0 0 15px rgba(0, 255, 0, 0.5)' } : {}}
        >
          {isCameraOn ? '[CAM:ON]' : '[CAM:OFF]'}
        </button>
      </div>
    </div>
  );
}


