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
    <div className="h-40 bg-black border-l-2 border-b-2 border-green-400/30 p-4 flex flex-col" style={{ boxShadow: '0 0 15px rgba(0, 255, 0, 0.1)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 animate-pulse" style={{ boxShadow: '0 0 8px rgba(0, 255, 0, 0.8)' }} />
          <h2 className="text-xs font-mono tracking-wider text-green-400 uppercase">
            [TRANSCRIPT.LOG]
          </h2>
        </div>
        <span className="text-[10px] text-cyan-400/70 font-mono tracking-wide uppercase">
          &gt; LIVE_FEED
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar border-2 border-green-400/20 bg-black/50 p-2"
      >
        <p className="text-xs text-green-400/80 leading-relaxed whitespace-pre-wrap font-mono">
          {text || "&gt; Awaiting input..."}
        </p>
      </div>
    </div>
  );
}