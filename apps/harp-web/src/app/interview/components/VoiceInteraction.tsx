'use client';

import { useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import AudioPlayer from './AudioPlayer';

interface VoiceInteractionProps {
  onTranscript?: (text: string, isFinal: boolean) => void;
  audioBase64?: string;
  enabled?: boolean;
}

export default function VoiceInteraction({
  onTranscript,
  audioBase64,
  enabled = true
}: VoiceInteractionProps) {
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);

  const {
    isListening,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (onTranscript) {
        onTranscript(text, isFinal);
      }
    },
    onError: (error) => {
      console.error('[VoiceInteraction] STT error:', error);
    },
  });

  const toggleMicrophone = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  if (!enabled || !isSupported) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Voice Controls */}
      <div className="flex items-center gap-2 bg-black border-2 border-green-400/30 px-3 py-2">
        {/* Microphone Button */}
        <button
          onClick={toggleMicrophone}
          className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider transition-all border-2 ${
            isListening
              ? 'bg-red-400 text-black border-red-400 animate-pulse'
              : 'bg-black text-green-400 border-green-400/50 hover:border-green-400'
          }`}
          style={isListening ? { boxShadow: '0 0 15px rgba(255, 0, 0, 0.5)' } : {}}
        >
          {isListening ? '[MIC:REC]' : '[MIC:OFF]'}
        </button>

        {/* TTS Toggle */}
        <button
          onClick={() => setIsTTSEnabled(!isTTSEnabled)}
          className={`px-3 py-1.5 text-xs font-mono tracking-wider transition-all border-2 ${
            isTTSEnabled
              ? 'text-cyan-400 border-cyan-400 bg-cyan-400/10'
              : 'text-green-400/50 border-green-400/30 hover:text-green-400 hover:border-green-400/50'
          }`}
        >
          {isTTSEnabled ? '[TTS:ON]' : '[TTS:OFF]'}
        </button>

        {/* Status Indicator */}
        <div className="flex-1 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-400 animate-pulse' : 'bg-green-400/30'}`}
               style={isListening ? { boxShadow: '0 0 8px rgba(255, 0, 0, 0.8)' } : {}} />
          <span className="text-xs font-mono text-green-400/70">
            {isListening ? '&gt; LISTENING...' : '&gt; READY'}
          </span>
        </div>
      </div>

      {/* Interim Transcript Display */}
      {isListening && interimTranscript && (
        <div className="bg-black border-2 border-yellow-400/30 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-yellow-400">[INTERIM]</span>
          </div>
          <p className="text-xs text-yellow-400/70 font-mono italic">
            {interimTranscript}
          </p>
        </div>
      )}

      {/* Audio Player for TTS */}
      {isTTSEnabled && audioBase64 && (
        <AudioPlayer audioBase64={audioBase64} autoPlay={true} />
      )}
    </div>
  );
}
