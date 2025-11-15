export default function Terminal() {
  return (
    <div className="h-40 bg-gradient-to-br from-black via-gray-950 to-black border-r border-white/10 overflow-hidden flex flex-col shadow-2xl shadow-white/5">
      <div className="bg-gradient-to-r from-white/5 to-transparent border-b border-white/10 px-4 py-2.5 flex items-center gap-2 backdrop-blur-sm">
        <span className="text-sm text-white font-medium tracking-wide">Terminal</span>
        <div className="flex-1"></div>
        <button className="text-white hover:bg-gradient-to-br hover:from-white hover:to-gray-100 hover:text-black transition-all duration-300 text-xs border border-white/40 hover:border-white px-4 py-1.5 rounded-lg shadow-lg hover:shadow-white/20 bg-white/5">
          ▶ Run
        </button>
      </div>
      <div className="flex-1 p-4 font-mono text-sm bg-gradient-to-br from-black to-gray-950/50 overflow-auto">
        <div className="text-green-400/80 font-medium">$ python solution.py</div>
        <div className="text-gray-400 mt-1.5">Ready to execute...</div>
      </div>
    </div>
  );
}
