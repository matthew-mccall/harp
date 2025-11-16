'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

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

    const initTerminal = () => {
      try {
        if (!mounted || !terminalRef.current) {
          // Return a no-op cleanup to keep return type consistent
          return () => {};
        }

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

        // Watch for container size changes (for resize handles)
        const resizeObserver = new ResizeObserver(() => {
          if (mounted && fitAddonRef.current) {
            try {
              fitAddonRef.current.fit();
            } catch (e) {
              // Ignore resize errors
            }
          }
        });

        if (terminalRef.current) {
          resizeObserver.observe(terminalRef.current);
        }

        return () => {
          mounted = false;
          window.removeEventListener('resize', handleResize);
          resizeObserver.disconnect();
          if (term) {
            term.dispose();
          }
        };
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
        // Return a no-op cleanup on failure
        return () => {};
      }
    };

    const cleanup = initTerminal();
    return cleanup;
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
    <div className="h-full bg-black border-r-2 border-b-2 border-green-400/30 overflow-hidden flex flex-col">
      <div className="bg-black border-b-2 border-green-400/30 px-4 py-2 flex items-center gap-2 no-crt-lines" style={{ boxShadow: '0 0 15px rgba(0, 255, 0, 0.1)' }}>
        <span className="text-green-400 font-mono text-xs">[TERMINAL]</span>
        <div className="flex-1"></div>
        <button
          onClick={handleClear}
          className="text-xs font-mono text-green-400 border-2 border-green-400/50 hover:border-green-400 hover:shadow-[0_0_10px_rgba(0,255,0,0.5)] px-3 py-1 transition-all duration-300"
        >
          [CLEAR]
        </button>
      </div>
      <div ref={terminalRef} className="flex-1 p-2 overflow-hidden no-crt-lines" />
    </div>
  );
}
