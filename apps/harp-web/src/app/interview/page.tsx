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
  const [liveText, setLiveText] = useState('');
  useEffect(() => {
    console.log('[LiveText] Updated:', liveText);
  }, [liveText]);
  const [interviewState, setInterviewState] = useState<any | null>(null);

  const [currentCode, setCurrentCode] = useState('');
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHintCodeRef = useRef<string>('');

  const evaluateCode = async (code: string, stdout: string) => {
    if (!interviewState) {
      console.log('[EVAL] Skipped — no interviewState yet.');
      return;
    }

    console.log('[EVAL] Evaluating code with stdout length:', stdout.length);

    try {
      const response = await fetch('http://localhost:4000/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `The candidate has just run their solution code for the current interview question.\n\nHere is the current interview context (question + hints):\n${liveText}\n\nHere is the candidate's code:\n\`\`\`python\n${code}\n\`\`\`\n\nHere is the program output when run:\n\`\`\`\n${stdout}\n\`\`\`\n\nEvaluate whether this solution correctly solves the interview problem. Respond with: (1) a verdict ("correct" or "incorrect"), and (2) one or two sentences of feedback. Be concise. Do NOT introduce a new problem or ask a different question.`,
          difficulty: interviewState?.difficulty || 'easy',
        }),
      });

      const data = await response.json();
      console.log('[EVAL] Evaluation response:', data);
      setLiveText((prev) =>
        prev
          ? `${prev}\n\nEvaluation: ${data.messageToUser || ''}`
          : data.messageToUser || ''
      );
    } catch (error) {
      console.error('[EVAL] Failed to evaluate solution:', error);
      setLiveText((prev) =>
        prev
          ? `${prev}\n\nEvaluation: Failed to evaluate solution.`
          : 'Failed to evaluate solution.'
      );
    }
  };

  useEffect(() => {
    const startInterview = async () => {
      console.log("STARTING INTERVIEW....");
      try {
        const response = await fetch('http://localhost:4000/api/start-interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ difficulty: 'easy' }),
        });
        const data = await response.json();
        console.log("[INTERVIEW] Response data:", data);
        setInterviewState(data.state);
        setLiveText(data.messageToUser || '');
      } catch (error) {
        console.error('Failed to start interview:', error);
        setLiveText('Failed to start interview. Please try again.');
      }
    };
    startInterview();
  }, []);
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
  // 1) First call our interview evaluator (no stdout yet)
  await evaluateCode(code, '');

  // 2) Then run the code in the terminal as before
  if (typeof window !== 'undefined' && (window as any).writeToTerminal) {
    (window as any).writeToTerminal('\x1b[33m$ Running code...\x1b[0m');
    (window as any).writeToTerminal('');
  }

  try {
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const result = await response.json();

    if (typeof window !== 'undefined' && (window as any).writeToTerminal) {
      if (result.success) {
        (window as any).writeToTerminal('\x1b[32m✓ Execution completed\x1b[0m');
        (window as any).writeToTerminal('');
        (window as any).writeToTerminal('\x1b[36mOutput:\x1b[0m');
        (window as any).writeToTerminal('');
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

    // (Optional) if later you want a second evaluation using stdout, you can call:
    // if (result.success) {
    //   await evaluateCode(code, result.stdout || '');
    // }
  } catch (error) {
    console.error('Error executing code:', error);
    if (typeof window !== 'undefined' && (window as any).writeToTerminal) {
      (window as any).writeToTerminal('\x1b[31m✗ Failed to connect to server\x1b[0m', true);
      (window as any).writeToTerminal('');
    }
  }
};

  const sendIdleHint = async () => {
    if (!interviewState) {
      console.log("[HINT] Skipped — no interviewState yet.");
      return;
    }
    console.log("[HINT] Sending idle hint with code:", currentCode);
    try {
      const response = await fetch('http://localhost:4000/api/hint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `We are working on the following coding interview problem:\n\n${liveText}\n\nHere is my current code attempt:\n\`\`\`python\n${currentCode}\n\`\`\`\n\nBased ONLY on this problem and this code, give exactly one short interviewing-style hint (1–2 sentences) that helps me move forward on this SAME problem. Do not introduce a new problem. Do not restate the entire problem. Do not give a full solution. Make sure your entire reply MUST be a hint, nothing else.`,
          difficulty: interviewState.difficulty || 'easy',
        }),
      });
      const data = await response.json();
      console.log("[HINT] Hint data: ", data);
      lastHintCodeRef.current = currentCode;
      setLiveText((prev) =>
        prev
          ? `${prev}\n\nHint: ${data.messageToUser || ''}`
          : data.messageToUser || ''
      );
    } catch (error) {
      console.error('Failed to fetch hint:', error);
    }
  };

  useEffect(() => {

    console.log("🔥 [IDLE] effect fired");
    console.log("   currentCode length:", currentCode.length);
    console.log("   lastHintCode length:", lastHintCodeRef.current.length);
    console.log("   equal?:", currentCode === lastHintCodeRef.current);
    if (!interviewState){
      console.log("[IDLE] no interview state");
      return;
    }
    if (idleTimeoutRef.current) {
      console.log("[IDLE] clearing previous timer");
      clearTimeout(idleTimeoutRef.current);
    }

    if (currentCode === lastHintCodeRef.current) {
      console.log("[IDLE] Code unchanged since last hint — not scheduling new timer.");
      return;
    }

    idleTimeoutRef.current = setTimeout(() => {
      console.log("[IDLE] 20s idle reached → sending hint.");
      sendIdleHint();
    }, 20000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (idleTimeoutRef.current) {
        console.log("[IDLE] Cleanup — clearing timeout.");
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [currentCode, interviewState]);

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
          <CodeEditor onRunCode={handleRunCode} onCodeChange={setCurrentCode} />
          
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
          <LiveTranscription text={liveText} />
          <UserCamera />
        </div>
      </div>
    </div>
  );
}