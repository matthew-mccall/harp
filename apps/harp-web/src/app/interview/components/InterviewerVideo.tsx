export default function InterviewerVideo() {
  return (
    <div className="h-64 bg-gradient-to-br from-black via-gray-950 to-black border-l border-b border-white/10 overflow-hidden relative shadow-2xl shadow-white/5">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full border-2 border-white/10 bg-gradient-to-br from-white/5 to-transparent shadow-inner"></div>
      </div>
      <div className="absolute top-4 left-4 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-lg text-xs shadow-lg">
        Interviewer
      </div>
    </div>
  );
}
