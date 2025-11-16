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
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Settings Modal */}
      <div
        className="relative w-full max-w-2xl mx-4 bg-gradient-to-br from-gray-950 via-black to-gray-950 rounded-2xl shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-white/20 rounded-tl-2xl" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-white/20 rounded-br-2xl" />

        {/* Header */}
        <div className="relative p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-white/50 to-transparent" />
              <h2 className="text-2xl font-bold text-white">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="group relative p-2 text-gray-400 hover:text-white transition-colors"
            >
              <span className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <svg
                className="w-6 h-6 relative"
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
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <h3 className="text-xs font-medium text-white/60 tracking-widest uppercase">
                Interview
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
                className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition-colors [&>option]:bg-black [&>option]:text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </SettingItem>

            <SettingItem
              label="Interview Duration"
              description="Set the time limit for each session"
            >
              <select defaultValue="45" className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition-colors [&>option]:bg-black [&>option]:text-white">
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </SettingItem>

            <SettingItem
              label="Programming Language"
              description="Default language for code editor"
            >
              <select defaultValue="python" className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition-colors [&>option]:bg-black [&>option]:text-white">
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </SettingItem>
          </div>

          {/* Audio/Video Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <h3 className="text-xs font-medium text-white/60 tracking-widest uppercase">
                Audio & Video
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <h3 className="text-xs font-medium text-white/60 tracking-widest uppercase">
                Feedback
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="relative px-6 py-2 text-sm text-white/60 hover:text-white transition-colors group"
          >
            <span className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative">Cancel</span>
          </button>
          <button
            onClick={onClose}
            className="relative px-6 py-2 text-sm text-white transition-all duration-300 hover:scale-105 group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-lg blur-sm group-hover:blur-md transition-all" />
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative">Save Changes</span>
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
        <label className="text-sm font-medium text-white/90">{label}</label>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-white/20 transition-colors border border-white/20 peer-checked:border-white/40">
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white/50 rounded-full transition-transform peer-checked:translate-x-5 peer-checked:bg-white" />
      </div>
    </label>
  );
}
