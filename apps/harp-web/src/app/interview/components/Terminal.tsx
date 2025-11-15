export default function Terminal() {
  return (
    <div className="h-40 bg-black border-2 border-white/30 rounded overflow-hidden flex flex-col">
      <div className="bg-black border-b border-white/20 px-4 py-2 flex items-center gap-2">
        <span className="text-sm text-white">Terminal</span>
        <div className="flex-1"></div>
        <button className="text-white hover:bg-white hover:text-black transition text-xs border border-white/40 px-3 py-1 rounded">
          ▶ Run
        </button>
      </div>
      <div className="flex-1 p-4 font-mono text-sm bg-black overflow-auto">
        <div className="text-gray-500">$ python solution.py</div>
        <div className="text-gray-400 mt-1">Ready to execute...</div>
      </div>
    </div>
  );
}
