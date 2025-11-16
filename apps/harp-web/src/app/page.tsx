import Link from 'next/link';

export default function Index() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden crt-screen">
      {/* Retro grid background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.1
        }} />
      </div>
      
      {/* Glowing corners */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-cyan-400" style={{ boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)' }} />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-4 border-t-4 border-green-400" style={{ boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)' }} />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-4 border-b-4 border-green-400" style={{ boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)' }} />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-cyan-400" style={{ boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)' }} />
      
      <div className="text-center relative z-10 px-6 max-w-4xl">
        {/* Retro-modern title */}
        <div className="mb-8">
          <div className="text-sm retro-text-cyan mb-2 tracking-widest">&gt; SYSTEM.BOOT</div>
          <h1 className="text-6xl font-bold mb-3 retro-glow" style={{
            fontFamily: 'Courier New, monospace',
            color: '#00ff00',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            HARP_INTERVIEW.EXE
          </h1>
          <div className="text-sm retro-text mb-2">[ ARTIFICIAL INTELLIGENCE RECRUITMENT PROTOCOL ]</div>
        </div>
        
        {/* Retro progress bar style underline */}
        <div className="w-96 mx-auto mb-8 h-2 bg-black border-2 border-green-400 relative overflow-hidden" style={{ boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-cyan-400 to-green-400 animate-[gradient_2s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
        </div>
        
        <div className="bg-black/60 border-2 border-green-400/50 p-6 mb-8 max-w-2xl mx-auto" style={{ boxShadow: '0 0 15px rgba(0, 255, 0, 0.2)' }}>
          <p className="text-sm retro-text-cyan mb-3 font-mono">
            &gt; MISSION: TECHNICAL_INTERVIEW_SIMULATION
          </p>
          <p className="text-xs text-green-400/70 font-mono leading-relaxed">
            // Experience realistic coding interviews with AI<br/>
            // Get instant feedback in a live environment<br/>
            // Build confidence before your next opportunity<br/>
            <span className="text-cyan-400">// STATUS: READY</span>
          </p>
        </div>
        
        {/* Retro-modern button */}
        <Link 
          href="/interview" 
          className="group relative inline-block mb-12"
        >
          <div className="relative bg-black border-4 border-green-400 px-12 py-4 transition-all duration-200 hover:border-cyan-400 hover:translate-x-1 hover:-translate-y-1" style={{
            boxShadow: '6px 6px 0px rgba(0, 255, 0, 0.5)',
            clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
          }}>
            <span className="retro-text text-xl tracking-widest font-bold block">
              [ INITIALIZE ]
            </span>
            <span className="text-cyan-400 text-xs font-mono block mt-1">&gt; press.enter_</span>
          </div>
        </Link>
        
        {/* Retro feature boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-black border-2 border-green-400/50 p-4 transition-all hover:border-green-400 hover:shadow-[0_0_20px_rgba(0,255,0,0.3)]">
            <div className="text-green-400 text-xs font-mono mb-2">[MODULE_01]</div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2 font-mono">AI.INTERVIEWER</h3>
            <p className="text-[10px] text-green-400/70 font-mono leading-relaxed">
              &gt; Responsive AI agent<br/>
              &gt; Real interview questions<br/>
              &gt; Natural interaction
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="bg-black border-2 border-cyan-400/50 p-4 transition-all hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]">
            <div className="text-cyan-400 text-xs font-mono mb-2">[MODULE_02]</div>
            <h3 className="text-sm font-bold text-green-400 mb-2 font-mono">LIVE.CODING</h3>
            <p className="text-[10px] text-cyan-400/70 font-mono leading-relaxed">
              &gt; Real-time execution<br/>
              &gt; Integrated terminal<br/>
              &gt; Instant compilation
            </p>
          </div>
          
          {/* Feature 3 */}
          <div className="bg-black border-2 border-green-400/50 p-4 transition-all hover:border-green-400 hover:shadow-[0_0_20px_rgba(0,255,0,0.3)]">
            <div className="text-green-400 text-xs font-mono mb-2">[MODULE_03]</div>
            <h3 className="text-sm font-bold text-cyan-400 mb-2 font-mono">FEEDBACK.SYS</h3>
            <p className="text-[10px] text-green-400/70 font-mono leading-relaxed">
              &gt; Performance metrics<br/>
              &gt; Instant insights<br/>
              &gt; Style analysis
            </p>
          </div>
        </div>
      </div>
      
      {/* Retro terminal corners */}
      <div className="absolute bottom-4 left-4 text-green-400/30 text-xs font-mono">
        &gt; SYSTEM.STATUS: OPERATIONAL<br/>
        &gt; AI.CORE: ACTIVE<br/>
        &gt; READY_
      </div>
      <div className="absolute top-4 right-4 text-cyan-400/30 text-xs font-mono text-right">
        HARP v1.0.0<br/>
        BUILD: 2025.11.16<br/>
        [RETRO.MODERN]
      </div>
    </div>
  );
}
