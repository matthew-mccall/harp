import Link from 'next/link';

export default function Index() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <div className="text-center relative z-10 px-6 max-w-4xl">
        {/* Gradient animated title */}
        <h1 className="text-6xl font-bold mb-5 bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent animate-[gradient_3s_ease-in-out_infinite] bg-[length:200%_auto]">
          Virtual Interview Tester
        </h1>
        
        {/* Flowing underline */}
        <div className="h-0.5 w-64 mx-auto mb-6 bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
        
        <p className="text-lg text-gray-400 mb-4 font-light tracking-wide">
          Practice your technical interviews with AI
        </p>
        
        <p className="text-xs text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
          Experience realistic coding interviews with our AI interviewer. Get instant feedback, 
          practice in a live coding environment, and build confidence before your next big opportunity.
        </p>
        
        {/* Floating button with glow effect */}
        <Link 
          href="/interview" 
          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white transition-all duration-300 hover:scale-105 mb-10"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-full blur-md group-hover:blur-xl transition-all" />
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative flex items-center gap-2">
            Start Interview
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </Link>
        
        {/* Feature highlights in flowing layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
            <div className="relative text-center">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="text-xs font-medium text-white/80 mb-1.5 tracking-wide">AI Interviewer</h3>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Interact with a responsive AI that asks real interview questions
              </p>
            </div>
          </div>
          
          {/* Feature 2 */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
            <div className="relative text-center">
              <div className="text-2xl mb-2">💻</div>
              <h3 className="text-xs font-medium text-white/80 mb-1.5 tracking-wide">Live Coding</h3>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Write and execute code in real-time with an integrated terminal
              </p>
            </div>
          </div>
          
          {/* Feature 3 */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
            <div className="relative text-center">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="text-xs font-medium text-white/80 mb-1.5 tracking-wide">Real-Time Feedback</h3>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Get instant insights on your performance and communication style
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute bottom-10 left-10 text-white/10 text-sm font-mono">{'<AI_READY />'}</div>
      <div className="absolute top-10 right-10 text-white/10 text-sm font-mono">{'{ interview: true }'}</div>
    </div>
  );
}
