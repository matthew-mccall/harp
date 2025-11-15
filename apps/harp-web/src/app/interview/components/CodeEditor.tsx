export default function CodeEditor() {
  return (
    <div className="flex-1 bg-gradient-to-br from-black via-black to-gray-950 border-r border-b border-white/10 overflow-hidden flex flex-col shadow-2xl shadow-white/5">
      <div className="bg-gradient-to-r from-white/5 to-transparent border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-sm">
        <div className="flex gap-2.5">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500/80 to-red-600/60 border border-red-400/30 shadow-sm shadow-red-500/20"></div>
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-500/80 to-yellow-600/60 border border-yellow-400/30 shadow-sm shadow-yellow-500/20"></div>
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500/80 to-green-600/60 border border-green-400/30 shadow-sm shadow-green-500/20"></div>
        </div>
        <span className="text-sm text-white font-medium tracking-wide">solution.py</span>
        <div className="text-xs text-gray-300 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 px-3 py-1.5 rounded-md shadow-inner">
          Python
        </div>
      </div>
      <div className="flex-1 p-6 font-mono text-sm bg-gradient-to-br from-black to-gray-950/50 overflow-auto">
        <pre className="text-gray-300 leading-relaxed">
          <code>{`def two_sum(nums, target):
    # Your code here
    pass`}</code>
        </pre>
      </div>
    </div>
  );
}
