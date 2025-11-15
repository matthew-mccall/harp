'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from './components/Navbar';
import CodeEditor from './components/CodeEditor';
import InterviewerVideo from './components/InterviewerVideo';
import LiveTranscription from './components/LiveTranscription';
import UserCamera from './components/UserCamera';
import ResizeHandle from './components/ResizeHandle';

// Import Terminal with no SSR to avoid xterm.js server-side rendering issues
const Terminal = dynamic(() => import('./components/Terminal'), {
  ssr: false,
  loading: () => (
    <div className="h-40 bg-gradient-to-br from-black via-gray-950 to-black border-r border-white/10 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Loading terminal...</span>
    </div>
  ),
});

export default function InterviewPage() {
  const [terminalHeight, setTerminalHeight] = useState(160);
  const [leftPanelWidth, setLeftPanelWidth] = useState(70);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isDraggingTerminal) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = containerRect.bottom - e.clientY;
        setTerminalHeight(Math.min(Math.max(newHeight, 100), 600));
      }

      if (isDraggingPanel) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        setLeftPanelWidth(Math.min(Math.max(newWidth, 30), 85));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTerminal(false);
      setIsDraggingPanel(false);
    };

    if (isDraggingTerminal || isDraggingPanel) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDraggingTerminal ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingTerminal, isDraggingPanel]);

  const handleRunCode = async (code: string) => {
    
    // Write to terminal that code is running
    if (typeof window !== 'undefined' && (window as any).writeToTerminal) {
      (window as any).writeToTerminal('\x1b[33m$ Running code...\x1b[0m');
      (window as any).writeToTerminal('');
    }

    try {
      // Send code to your backend API
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      // Display results in terminal
      if (typeof window !== 'undefined' && (window as any).writeToTerminal) {
        if (result.success) {
          (window as any).writeToTerminal('\x1b[32m✓ Execution completed\x1b[0m');
          (window as any).writeToTerminal('');
          (window as any).writeToTerminal('\x1b[36mOutput:\x1b[0m');
          result.stdout.split('\n').forEach((line: string) => {
            (window as any).writeToTerminal(line);
          });
          if (result.stderr) {
            (window as any).writeToTerminal('');
            (window as any).writeToTerminal('\x1b[31mErrors:\x1b[0m');
            result.stderr.split('\n').forEach((line: string) => {
              (window as any).writeToTerminal(line, true);
            });
          }
        } else {
          (window as any).writeToTerminal('\x1b[31m✗ Execution failed\x1b[0m', true);
          (window as any).writeToTerminal(result.error || 'Unknown error', true);
        }
        (window as any).writeToTerminal('');
      }
    } catch (error) {
      console.error('Error executing code:', error);
      if (typeof window !== 'undefined' && (window as any).writeToTerminal) {
        (window as any).writeToTerminal('\x1b[31m✗ Failed to connect to server\x1b[0m', true);
        (window as any).writeToTerminal('');
      }
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <Navbar />

      {/* Main Content */}
      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden"
      >
        {/* Left Section - IDE */}
        <div style={{ width: `${leftPanelWidth}%` }} className="flex flex-col overflow-hidden">
          <CodeEditor onRunCode={handleRunCode} />
          
          {/* Terminal Resize Handle */}
          <ResizeHandle
            orientation="horizontal"
            onMouseDown={() => setIsDraggingTerminal(true)}
            isDragging={isDraggingTerminal}
          />
          
          <div style={{ height: `${terminalHeight}px` }}>
            <Terminal />
          </div>
        </div>

        {/* Panel Resize Handle */}
        <ResizeHandle
          orientation="vertical"
          onMouseDown={() => setIsDraggingPanel(true)}
          isDragging={isDraggingPanel}
        />

        {/* Right Section - Video & Captions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <InterviewerVideo />
          <LiveTranscription />
          <UserCamera />
        </div>
      </div>
    </div>
  );
}