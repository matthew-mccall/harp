export default function CodeEditor() {
  return (
    <div className="flex-1 bg-black border-2 border-white/30 rounded overflow-hidden flex flex-col">
      <div className="bg-black border-b border-white/20 px-4 py-2 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full border border-white/50"></div>
          <div className="w-3 h-3 rounded-full border border-white/50"></div>
          <div className="w-3 h-3 rounded-full border border-white/50"></div>
        </div>
        <span className="text-sm text-white">solution.py</span>
        <div className="text-xs text-gray-400 border border-white/20 px-2 py-1 rounded">
          Python
        </div>
      </div>
      <div className="flex-1 p-4 font-mono text-sm bg-black overflow-auto">
        <pre className="text-gray-300">
          <code>{`def two_sum(nums, target):
    # Your code here
    pass`}</code>
        </pre>
      </div>
    </div>
  );
}
