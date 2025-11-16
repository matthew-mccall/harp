'use client';

import { useEffect, useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [difficulty, setDifficulty] = useState('medium');
  useEffect(() => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('harp_interview_difficulty');
    if (stored === 'easy' || stored === 'medium' || stored === 'hard') {
      setDifficulty(stored);
    }
  }
}, []);
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn"
      onClick={onClose}
    >
      {/* Backdrop with blur and CRT effect */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm crt-screen" />

      {/* Retro Settings Modal */}
      <div
        className="relative w-full max-w-2xl mx-4 bg-black border-4 border-green-400/50 animate-scaleIn"
        style={{ 
          boxShadow: '0 0 30px rgba(0, 255, 0, 0.3), inset 0 0 20px rgba(0, 255, 0, 0.1)',
          clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Retro corner accents */}
        <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-cyan-400/50" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-cyan-400/50" />

        {/* Header */}
        <div className="relative p-6 border-b-2 border-green-400/30 bg-black/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-green-400 animate-pulse" style={{ boxShadow: '0 0 8px rgba(0, 255, 0, 0.8)' }} />
              <h2 className="text-2xl font-bold font-mono text-green-400 tracking-wider" style={{ textShadow: '0 0 8px rgba(0, 255, 0, 0.6)' }}>
                [SETTINGS.CFG]
              </h2>
            </div>
            <button
              onClick={onClose}
              className="group relative p-2 text-cyan-400 hover:text-green-400 transition-colors border-2 border-cyan-400/50 hover:border-green-400"
            >
              <svg
                className="w-5 h-5 relative"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
          {/* Interview Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
                &gt; INTERVIEW_CONFIG
              </h3>
            </div>

            <SettingItem
              label="Difficulty Level"
              description="Adjust the complexity of interview questions"
            >
              <select
                defaultValue="medium"
                value={difficulty}
                onChange={(e) => {
                  const value = e.target.value;
                  setDifficulty(value);
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem('harp_interview_difficulty', value);
                  }
                }}
                className="bg-black border-2 border-green-400/50 px-3 py-2 text-xs text-green-400 font-mono focus:outline-none focus:border-green-400 transition-colors [&>option]:bg-black [&>option]:text-green-400"
              >
                <option value="easy">EASY</option>
                <option value="medium">MEDIUM</option>
                <option value="hard">HARD</option>
              </select>
            </SettingItem>

            <SettingItem
              label="Interview Duration"
              description="Set the time limit for each session"
            >
              <select defaultValue="45" className="bg-black border-2 border-green-400/50 px-3 py-2 text-xs text-green-400 font-mono focus:outline-none focus:border-green-400 transition-colors [&>option]:bg-black [&>option]:text-green-400">
                <option value="30">30 MIN</option>
                <option value="45">45 MIN</option>
                <option value="60">60 MIN</option>
                <option value="90">90 MIN</option>
              </select>
            </SettingItem>

            <SettingItem
              label="Programming Language"
              description="Default language for code editor"
            >
              <select defaultValue="python" className="bg-black border-2 border-green-400/50 px-3 py-2 text-xs text-green-400 font-mono focus:outline-none focus:border-green-400 transition-colors [&>option]:bg-black [&>option]:text-green-400">
                <option value="python">PYTHON</option>
                <option value="javascript">JAVASCRIPT</option>
                <option value="java">JAVA</option>
                <option value="cpp">C++</option>
              </select>
            </SettingItem>
          </div>

          {/* Audio/Video Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
                &gt; AUDIO_VIDEO_CONFIG
              </h3>
            </div>

            <SettingItem
              label="Enable Camera"
              description="Allow camera access during interviews"
            >
              <ToggleSwitch defaultChecked />
            </SettingItem>

            <SettingItem
              label="Enable Microphone"
              description="Allow microphone access for voice responses"
            >
              <ToggleSwitch defaultChecked />
            </SettingItem>

            <SettingItem
              label="AI Voice"
              description="Enable text-to-speech for interviewer"
            >
              <ToggleSwitch defaultChecked />
            </SettingItem>
          </div>

          {/* Feedback Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
                &gt; FEEDBACK_CONFIG
              </h3>
            </div>

            <SettingItem
              label="Real-time Hints"
              description="Get subtle hints during the interview"
            >
              <ToggleSwitch />
            </SettingItem>

            <SettingItem
              label="Emotion Analysis"
              description="Track facial expressions during interview"
            >
              <ToggleSwitch defaultChecked />
            </SettingItem>

            <SettingItem
              label="Code Quality Feedback"
              description="Receive instant feedback on code style"
            >
              <ToggleSwitch defaultChecked />
            </SettingItem>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-green-400/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-gray-500 border-2 border-gray-700 hover:border-gray-500 hover:text-gray-400 transition-colors"
          >
            [CANCEL]
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-green-400 border-2 border-green-400/50 hover:border-green-400 hover:shadow-[0_0_10px_rgba(0,255,0,0.5)] transition-all duration-300"
          >
            [SAVE_CHANGES]
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingItem({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 group">
      <div className="flex-1">
        <label className="text-xs font-mono text-green-400 uppercase tracking-wide">{label}</label>
        <p className="text-xs font-mono text-gray-600 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
      <div className="w-11 h-6 bg-black border-2 border-green-400/30 peer peer-checked:border-green-400 transition-all">
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-gray-700 transition-all peer-checked:translate-x-5 peer-checked:bg-green-400 peer-checked:shadow-[0_0_8px_rgba(0,255,0,0.6)]" />
      </div>
    </label>
  );
}
