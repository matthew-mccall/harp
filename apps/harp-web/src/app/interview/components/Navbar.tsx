export default function Navbar() {
  return (
    <nav className="bg-black border-b border-white/20 px-6 py-4">
      <div className="flex items-center justify-between max-w-[1800px] mx-auto">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-white">H.A.R.P</h1>
          <div className="flex gap-6 text-sm text-gray-400">
            <button className="hover:text-white transition border-b border-transparent hover:border-white">
              Dashboard
            </button>
            <button className="hover:text-white transition border-b border-transparent hover:border-white">
              Sessions
            </button>
            <button className="hover:text-white transition border-b border-transparent hover:border-white">
              Settings
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-black px-4 py-2 rounded border border-white/30">
            <span className="text-gray-400 text-sm">Time: </span>
            <span className="font-mono text-white">45:30</span>
          </div>
          <button className="bg-black hover:bg-white hover:text-black px-4 py-2 rounded text-sm font-medium transition border border-white">
            End Interview
          </button>
        </div>
      </div>
    </nav>
  );
}
