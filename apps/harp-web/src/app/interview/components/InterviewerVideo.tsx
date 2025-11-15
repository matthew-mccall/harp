export default function InterviewerVideo() {
  return (
    <div className="h-64 bg-black border-2 border-white/30 rounded overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full border-2 border-white/20"></div>
      </div>
      <div className="absolute top-4 left-4 bg-black border border-white/40 px-3 py-1 rounded text-xs">
        Interviewer
      </div>
    </div>
  );
}
