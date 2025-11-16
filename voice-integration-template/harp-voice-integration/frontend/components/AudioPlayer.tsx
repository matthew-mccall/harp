'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  audioBase64?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export default function AudioPlayer({ audioBase64, autoPlay = true, onEnded }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioBase64 || !audioRef.current) return;

    const audio = audioRef.current;
    const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);
    
    audio.src = audioUrl;

    if (autoPlay) {
      audio.play().catch(err => {
        console.error('[AudioPlayer] Auto-play failed:', err);
      });
    }

    return () => {
      URL.revokeObjectURL(audioUrl);
    };
  }, [audioBase64, autoPlay]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('[AudioPlayer] Play failed:', err);
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioBase64) return null;

  return (
    <div className="flex items-center gap-3 bg-black border-2 border-cyan-400/30 px-3 py-2">
      <audio
        ref={audioRef}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      
      <button
        onClick={togglePlayPause}
        className="text-cyan-400 hover:text-green-400 transition-colors"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs font-mono text-green-400">{formatTime(currentTime)}</span>
        <div className="flex-1 h-1 bg-green-400/20 relative">
          <div 
            className="absolute inset-y-0 left-0 bg-green-400"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs font-mono text-green-400/60">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-1">
        <div className={`w-1 h-1 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-green-400/30'}`} />
        <span className="text-xs font-mono text-cyan-400">[AUDIO]</span>
      </div>
    </div>
  );
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
