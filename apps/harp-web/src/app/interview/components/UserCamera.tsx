export default function UserCamera() {
  return (
    <div className="flex-1 bg-black border-2 border-white/30 rounded overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-white/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-xs text-gray-500">Camera Off</p>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 bg-black border border-white/40 px-3 py-1 rounded text-xs">
        You
      </div>
    </div>
  );
}
