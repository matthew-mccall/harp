'use client';

import { useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import dynamic from 'next/dynamic';
import Navbar from './components/Navbar';
import CodeEditor from './components/CodeEditor';
import InterviewerVideo from './components/InterviewerVideo';
import LiveTranscription from './components/LiveTranscription';
import UserCamera from './components/UserCamera';
import ResizeHandle from './components/ResizeHandle';
import ProblemPanel from './components/ProblemPanel';
import VoiceInteraction from './components/VoiceInteraction';

// Import Terminal with no SSR to avoid xterm.js server-side rendering issues
const Terminal = dynamic(() => import('./components/Terminal'), {
  ssr: false,
  loading: () => (
    <div className="h-40 bg-black border-r-2 border-green-400/30 flex items-center justify-center">
      <span className="text-green-400 text-xs font-mono">&gt; LOADING_TERMINAL...</span>
    </div>
  ),
});

export default function InterviewPage() {
  const [terminalHeight, setTerminalHeight] = useState(160);
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [isProblemPanelCollapsed, setIsProblemPanelCollapsed] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [audioBase64, setAudioBase64] = useState<string | undefined>(undefined);
  const ttsQueueRef = useRef<string>(''); // Track the last TTS request to avoid duplicates
  useEffect(() => {
    console.log('[LiveText] Updated:', liveText);
  }, [liveText]);
  const [interviewState, setInterviewState] = useState<any | null>(null);

  const [currentCode, setCurrentCode] = useState('');
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHintCodeRef = useRef<string>('');
  const interviewStartedRef = useRef<boolean>(false); // Prevent multiple interview starts
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  type EmotionName = 'Angry' | 'Disgust' | 'Fear' | 'Happy' | 'Sad' | 'Surprise' | 'Neutral';

  const [currentEmotion, setCurrentEmotion] = useState<{
    emotion: EmotionName;
    probability: number;
  } | null>(null);

// Cooldown so hints don’t spam
const lastEmotionHintAtRef = useRef<number | null>(null);
  useEffect(() => {
    // On first mount, hydrate difficulty from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('harp_interview_difficulty');
      if (stored === 'easy' || stored === 'medium' || stored === 'hard') {
        setDifficulty(stored);
      }
    }
  }, []);

  // Connect to harp-emotion via Socket.IO and keep currentEmotion updated
  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return;

    // Allow override via env; default to local harp-emotion server
    const url = process.env.NEXT_PUBLIC_EMOTION_SOCKET_URL || 'http://localhost:3001';

    try {
      const socket = io(url, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socket.on('connect', () => {
        console.log(`[EMO] Connected to harp-emotion at ${url} (id=${socket.id})`);
      });

      socket.on('disconnect', (reason) => {
        console.log('[EMO] Disconnected from harp-emotion:', reason);
      });

      socket.on('connect_error', (err) => {
        console.warn('[EMO] Connection error:', (err as any)?.message || err);
      });

      // Payload shape comes from apps/harp-emotion/src/main.ts
      socket.on('emotion', (payload: any) => {
        try {
          const dom = payload?.dominantEmotion as { emotion?: EmotionName; probability?: number } | undefined;
          if (!dom || !dom.emotion) return;

          setCurrentEmotion({
            emotion: dom.emotion as EmotionName,
            probability: typeof dom.probability === 'number' ? dom.probability : 0,
          });

          // Debug: brief log
          if (dom) {
            console.log(`[EMO] ${dom.emotion} ${(Math.max(0, Math.min(1, dom.probability ?? 0)) * 100).toFixed(1)}%`);
          }
        } catch (e) {
          console.warn('[EMO] Failed to handle emotion payload:', (e as any)?.message || e);
        }
      });

      return () => {
        try {
          socket.removeAllListeners();
          socket.disconnect();
        } catch {
          // ignore
        }
      };
    } catch (e) {
      console.warn('[EMO] Socket initialization failed:', (e as any)?.message || e);
    }
  }, []);

  // Generate TTS from text
  const generateTTS = async (text: string) => {
    // Avoid duplicate TTS requests for the same text
    if (ttsQueueRef.current === text) {
      console.log('[TTS] Skipping duplicate request for same text');
      return;
    }

    ttsQueueRef.current = text;

    try {
      console.log('[TTS] Generating speech for:', text.substring(0, 50) + '...');

      // Clear previous audio before generating new one
      setAudioBase64(undefined);

      const response = await fetch('http://localhost:4000/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (data.success && data.audioBase64) {
        console.log('[TTS] Audio generated successfully');
        setAudioBase64(data.audioBase64);
      } else {
        console.error('[TTS] Failed:', data.error);
      }
    } catch (error) {
      console.error('[TTS] Error:', error);
    }
  };

  // Handle voice transcription
  const handleVoiceTranscript = async (text: string, isFinal: boolean) => {
    console.log('[VOICE] Transcript:', text, 'Final:', isFinal);

    if (!isFinal) {
      // Just show interim results, don't process yet
      return;
    }

    // Ignore empty transcripts (happens when stopping recording)
    const trimmedText = text.trim();
    if (!trimmedText) {
      console.log('[VOICE] Empty transcript, ignoring');
      return;
    }

    // Add user's speech to transcript
    setLiveText((prev) =>
      prev ? `${prev}\n\nYou: ${trimmedText}` : `You: ${trimmedText}`
    );

    // Process the voice command asynchronously without blocking
    // This prevents the mic from getting stuck
    setTimeout(async () => {
      // Check if user is asking for a hint
      const lowerText = trimmedText.toLowerCase();
      if (lowerText.includes('hint') || lowerText.includes('help') || lowerText.includes('stuck')) {
        console.log('[VOICE] User requested hint, triggering hint generation');
        await sendIdleHint();
        return;
      }

      // Otherwise, send as a general message to the interviewer
      if (!interviewState) {
        console.log('[VOICE] No interview state yet, skipping');
        return;
      }

      try {
        console.log('[VOICE] Sending user message to interviewer');
        const response = await fetch('http://localhost:4000/api/hint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: `The candidate said: "${trimmedText}"\n\nContext of the current problem:\n${liveText}\n\nRespond naturally to what the candidate said. If they're asking a question, answer it. If they're making a comment, acknowledge it and provide guidance. Keep it conversational and helpful.`,
            difficulty: interviewState.difficulty || 'easy',
          }),
        });

        const data = await response.json();
        const responseMessage = data.messageToUser || '';

        setLiveText((prev) =>
          prev ? `${prev}\n\nInterviewer: ${responseMessage}` : responseMessage
        );

        // Generate TTS for the response
        if (responseMessage) {
          await generateTTS(responseMessage);
        }
      } catch (error) {
        console.error('[VOICE] Failed to process voice input:', error);
      }
    }, 0);
  };


  const requestFinalFeedback = async (): Promise<string> => {
    if (!interviewState) {
      console.log('[FEEDBACK] Skipped — no interviewState yet.');
      return '';
    }

    try {
      console.log('[FEEDBACK] Requesting final interview feedback...');
      const response = await fetch('http://localhost:4000/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `The coding interview is now complete.

  Here is the full interview transcript (questions, hints, and candidate interactions):
  ${liveText}

  Please provide FINAL INTERVIEW FEEDBACK on the candidate as if you are a human interviewer. 
  Include:
  - 2–3 strengths you observed.
  - 2–3 areas for improvement.
  Keep it concise and focused on how they can improve in future interviews.`,
          difficulty: interviewState?.difficulty || 'easy',
        }),
      });

      const data = await response.json();
      console.log('[FEEDBACK] Final feedback response:', data);

      const feedbackMessage: string = data.messageToUser || '';
      return feedbackMessage;
    } catch (error) {
      console.error('[FEEDBACK] Failed to fetch final feedback:', error);
      return 'Failed to generate final interview feedback.';
    }
  };

  const evaluateCode = async (code: string, stdout: string): Promise<{
    isCorrect: boolean;
    message: string;
  }> => {
    if (!interviewState) {
      console.log('[EVAL] Skipped — no interviewState yet.');
      return { isCorrect: false, message: '' };
    }

    console.log('[EVAL] Evaluating code with stdout length:', stdout.length);

    try {
      const response = await fetch('http://localhost:4000/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `The candidate has just run their solution code for the current interview question.

  Here is the current interview context (question + hints):
  ${liveText}

  Here is the candidate's code:
  \`\`\`python
  ${code}
  \`\`\`

  Here is the program output when run:
  \`\`\`
  ${stdout}
  \`\`\`

  Evaluate whether this solution correctly solves the interview problem. 
  Respond with: (1) a verdict in the form **"Verdict: correct."** or **"Verdict: incorrect."**, 
  and (2) one or two sentences of feedback. Be concise. 
  Do NOT introduce a new problem or ask a different question.`,
          difficulty: interviewState?.difficulty || 'easy',
        }),
      });

      const data = await response.json();
      console.log('[EVAL] Evaluation response:', data);
      const evalMessage: string = data.messageToUser || '';

      // Parse verdict from the text (simple heuristic)
      const lower = evalMessage.toLowerCase();
      const isCorrect =
        lower.includes('verdict: correct') ||
        lower.startsWith('verdict: correct');

      console.log('[EVAL] Parsed correctness:', isCorrect);

      return { isCorrect, message: evalMessage };
    } catch (error) {
      console.error('[EVAL] Failed to evaluate solution:', error);
      return {
        isCorrect: false,
        message: 'Failed to evaluate solution.',
      };
    } finally {
      // After any evaluation, treat this code as the latest activity and clear the idle hint timer.
      console.log('[EVAL] Resetting idle hint state after evaluation');
      lastHintCodeRef.current = code;
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    }
  };

  useEffect(() => {
    const startInterview = async () => {
      // Prevent multiple starts (React Strict Mode calls effects twice in dev)
      if (interviewStartedRef.current) {
        console.log('[INTERVIEW] Already started, skipping duplicate call');
        return;
      }

      interviewStartedRef.current = true;

      console.log("STARTING INTERVIEW....");
      try {
        let diff: 'easy' | 'medium' | 'hard' = 'easy';
        if (typeof window !== 'undefined') {
          const stored = window.localStorage.getItem('harp_interview_difficulty');
          if (stored === 'easy' || stored === 'medium' || stored === 'hard') {
            diff = stored;
          }
        }
        setDifficulty(diff);
        console.log('[INTERVIEW] Using difficulty:', diff);
        const response = await fetch('http://localhost:4000/api/start-interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ difficulty: diff }),
        });
        const data = await response.json();
        console.log("[INTERVIEW] Response data:", data);
        setInterviewState(data.state);
        const welcomeMessage = data.messageToUser || '';
        setLiveText(welcomeMessage);
        // Generate TTS for welcome message
        if (welcomeMessage) {
          await generateTTS(welcomeMessage);
        }
      } catch (error) {
        console.error('Failed to start interview:', error);
        setLiveText('Failed to start interview. Please try again.');
      }
    };
    startInterview();
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);

  // // TEMPORARY HARD CODE CASE REMOVE AFTER DONE
  // useEffect(() => {
  //   console.log('[TEST EMO] Starting 30s timer to simulate emotion change...');
  //   const timer = setTimeout(() => {
  //     console.log('[TEST EMO] Switching emotion → Angry (0.7)');
  //     setCurrentEmotion({
  //       emotion: 'Angry',
  //       probability: 0.7,
  //     });
  //   }, 30000); // 30 seconds

  //   return () => clearTimeout(timer);
  // }, []);




  // EMOTION → HINT TRIGGER
  useEffect(() => {
    if (!interviewState) return;
    if (!currentEmotion) return;

    const { emotion } = currentEmotion;

    // Trigger condition
    const angry = emotion === 'Angry';
    const sad = emotion === 'Sad';

    // Skip if emotion is not concerning
    if (!angry && !sad) return;

    // Cooldown (prevent too many emotional hints)
    const now = Date.now();
    const cooldown = 20000; // 20s

    if (lastEmotionHintAtRef.current && now - lastEmotionHintAtRef.current < cooldown) {
      console.log('[EMO] In cooldown, not sending hint.');
      return;
    }

    console.log('[EMO] Emotion threshold exceeded → sending hint.', currentEmotion);
    lastEmotionHintAtRef.current = now;

    // Trigger the same hint system
    sendIdleHint();

    // Sync with idle hint system
    lastHintCodeRef.current = currentCode;
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, [currentEmotion, interviewState, currentCode]);



  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isDraggingTerminal) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = containerRect.bottom - e.clientY;
        setTerminalHeight(Math.min(Math.max(newHeight, 100), 600));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTerminal(false);
    };

    if (isDraggingTerminal) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingTerminal]);

  const handleRunCode = async (code: string) => {
  // reset idle-hint state on explicit "Run Code"
  console.log('[RUN] Run Code clicked — resetting idle hint timer');
  if (idleTimeoutRef.current) {
    clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = null;
    console.log('[RUN] Cleared existing idle hint timer');
  }

  // Treat the current code as "already hinted/evaluated" so
  // the idle effect will NOT schedule a new hint until code changes
  lastHintCodeRef.current = code;
  console.log('[RUN] Updated lastHintCodeRef to current code (length =', code.length, ')');

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

    if (result.success) {
      const evalResult = await evaluateCode(
        code,
        result.stdout || result.stderr || ''
      );

      const evalMessage = evalResult.message;
      const isCorrect = evalResult.isCorrect;
      console.log('[RUN] Evaluation correctness:', isCorrect);

      if (isCorrect) {
        // Get final feedback BEFORE updating the UI
        const feedbackMessage = await requestFinalFeedback();

        const combined = `Evaluation: ${evalMessage}\n\nFinal Feedback: ${feedbackMessage}`;

        setLiveText((prev) =>
          prev ? `${prev}\n\n${combined}` : combined
        );

        await generateTTS(combined);
      } else {
        // Only evaluation text
        const evalOnly = `Evaluation: ${evalMessage}`;
        setLiveText((prev) =>
          prev ? `${prev}\n\n${evalOnly}` : evalOnly
        );

        await generateTTS(evalOnly);
      }
    }
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
      const hintMessage = data.messageToUser || '';
      setLiveText((prev) =>
        prev
          ? `${prev}\n\nHint: ${hintMessage}`
          : hintMessage
      );
      // Generate TTS for hint
      if (hintMessage) {
        await generateTTS(hintMessage);
      }
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
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden crt-screen">
      <Navbar />

      {/* Main Content */}
      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden relative"
      >
        {/* Retro grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-5" style={{
          backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />

        {/* Problem Panel - Collapsible */}
        <ProblemPanel
          isCollapsed={isProblemPanelCollapsed}
          onToggle={() => setIsProblemPanelCollapsed(!isProblemPanelCollapsed)}
          interviewState={interviewState}
          problemText={liveText}
        />

        {/* Middle Section - IDE & Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
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

        {/* Right Section - Video & Captions */}
        <div className="w-96 flex flex-col overflow-hidden">
          <InterviewerVideo />
          <LiveTranscription text={liveText} />

          {/* Voice Interaction Controls */}
          <div className="p-3 bg-black border-b-2 border-green-400/30">
            <VoiceInteraction
              onTranscript={handleVoiceTranscript}
              audioBase64={audioBase64}
              enabled={true}
            />
          </div>

          <UserCamera />
        </div>
      </div>
    </div>
  );
}
