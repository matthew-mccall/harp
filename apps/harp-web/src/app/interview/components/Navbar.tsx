export default function Navbar() {
  return (
    <nav className="bg-gradient-to-b from-black via-black to-black/95 border-b border-white/10 px-6 py-4 backdrop-blur-sm shadow-lg shadow-white/5">
      <div className="flex items-center justify-between max-w-[1800px] mx-auto">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            H.A.R.P
          </h1>
          <div className="flex gap-6 text-sm text-gray-400">
            <button className="hover:text-white transition-all duration-200 border-b-2 border-transparent hover:border-white/80 pb-0.5">
              Dashboard
            </button>
            <button className="hover:text-white transition-all duration-200 border-b-2 border-transparent hover:border-white/80 pb-0.5">
              Sessions
            </button>
            <button className="hover:text-white transition-all duration-200 border-b-2 border-transparent hover:border-white/80 pb-0.5">
              Settings
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] px-4 py-2 rounded-lg border border-white/20 backdrop-blur-sm shadow-inner">
            <span className="text-gray-400 text-sm">Time: </span>
            <span className="font-mono text-white font-medium">45:30</span>
          </div>
          <button className="bg-gradient-to-br from-white/10 to-white/5 hover:from-white hover:to-gray-100 hover:text-black px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-white/40 hover:border-white shadow-lg hover:shadow-white/20">
            End Interview
          </button>
        </div>
      </div>
    </nav>
  );
}
