import React, { useEffect, useRef } from "react";

interface LiveTranscriptionProps {
  text: string;
}

export default function LiveTranscription({ text }: LiveTranscriptionProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom whenever text updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className="h-40 bg-gradient-to-br from-black via-gray-950 to-black border-l border-b border-white/10 p-4 shadow-2xl shadow-white/5 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 shadow-md shadow-emerald-500/40" />
          <h2 className="text-xs font-semibold tracking-wide text-gray-200 uppercase">
            Live Transcription
          </h2>
        </div>
        <span className="text-[10px] text-gray-400 tracking-wide uppercase">
          Interviewer ↔ Candidate
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {text || "Interview will start in a moment..."}
        </p>
      </div>
    </div>
  );
}