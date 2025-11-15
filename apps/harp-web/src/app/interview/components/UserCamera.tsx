'use client';

import { useEffect, useRef, useState } from 'react';

export default function UserCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="flex-1 bg-black border-2 border-white/30 rounded overflow-hidden relative">
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
            <div className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-white/30 flex items-center justify-center">
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
            <p className="text-xs text-gray-500 max-w-xs">
              {error || 'Camera Off'}
            </p>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 flex gap-2 z-10">
        <div className="bg-black/80 border border-white/40 px-3 py-1 rounded text-xs">
          You
        </div>
        <button
          onClick={isCameraOn ? stopCamera : startCamera}
          className="bg-black/80 hover:bg-white hover:text-black border border-white/40 px-3 py-1 rounded text-xs transition"
        >
          {isCameraOn ? '📹 On' : '📹 Off'}
        </button>
      </div>
    </div>
  );
}


