'use client';

import { useEffect, useRef, useState } from 'react';

interface TerminalProps {
  onClear?: () => void;
}

export default function Terminal({ onClear }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !terminalRef.current || xtermRef.current) return;

    let mounted = true;

    const initTerminal = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { Terminal: XTerm } = await import('xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        if (!mounted || !terminalRef.current) return undefined;

        const term = new XTerm({
          cursorBlink: false,
          fontSize: 13,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: '#000000',
            foreground: '#e5e5e5',
            cursor: '#ffffff',
            black: '#000000',
            red: '#ff6b6b',
            green: '#51cf66',
            yellow: '#ffd43b',
            blue: '#4dabf7',
            magenta: '#cc5de8',
            cyan: '#22b8cf',
            white: '#e5e5e5',
            brightBlack: '#495057',
            brightRed: '#ff8787',
            brightGreen: '#69db7c',
            brightYellow: '#ffe066',
            brightBlue: '#74c0fc',
            brightMagenta: '#da77f2',
            brightCyan: '#3bc9db',
            brightWhite: '#f8f9fa',
          },
          allowTransparency: true,
          disableStdin: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          if (mounted && terminalRef.current) {
            fitAddon.fit();
            term.writeln('\x1b[32m$ Ready to execute code...\x1b[0m');
            term.writeln('');
          }
        }, 100);

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        const handleResize = () => {
          if (mounted && fitAddonRef.current) {
            try {
              fitAddonRef.current.fit();
            } catch (e) {
              // Ignore resize errors
            }
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          mounted = false;
          window.removeEventListener('resize', handleResize);
          if (term) {
            term.dispose();
          }
        };
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
      }
    };

    initTerminal();

    return () => {
      mounted = false;
    };
  }, [isClient]);

  // Expose method to write to terminal from parent
  useEffect(() => {
    if (!isClient) return;

    (window as any).writeToTerminal = (text: string) => {
      if (xtermRef.current) {
        try {
          xtermRef.current.writeln(text);
        } catch (e) {
          console.error('Failed to write to terminal:', e);
        }
      }
    };

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).writeToTerminal;
      }
    };
  }, [isClient]);

  const handleClear = () => {
    if (xtermRef.current) {
      try {
        xtermRef.current.clear();
        xtermRef.current.writeln('\x1b[32m$ Ready to execute code...\x1b[0m');
        xtermRef.current.writeln('');
      } catch (e) {
        console.error('Failed to clear terminal:', e);
      }
    }
    if (onClear) {
      onClear();
    }
  };

  if (!isClient) {
    return (
      <div className="h-full bg-gradient-to-br from-black via-gray-950 to-black border-r border-white/10 flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading terminal...</span>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-black via-gray-950 to-black border-r border-white/10 overflow-hidden flex flex-col shadow-2xl shadow-white/5">
      <div className="bg-gradient-to-r from-white/5 to-transparent border-b border-white/10 px-4 py-2.5 flex items-center gap-2 backdrop-blur-sm">
        <span className="text-sm text-white font-medium tracking-wide">Terminal</span>
        <div className="flex-1"></div>
        <button 
          onClick={handleClear}
          className="text-white hover:bg-gradient-to-br hover:from-white hover:to-gray-100 hover:text-black transition-all duration-300 text-xs border border-white/40 hover:border-white px-4 py-1.5 rounded-lg shadow-lg hover:shadow-white/20 bg-white/5"
        >
          Clear
        </button>
      </div>
      <div ref={terminalRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
}
