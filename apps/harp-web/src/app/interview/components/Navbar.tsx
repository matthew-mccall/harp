'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import SettingsModal from './SettingsModal';

export default function Navbar() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleTabClick = (tab: string) => {
    if (tab === 'settings') {
      setIsSettingsOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <>
      <nav className="bg-black border-b-2 border-green-400/30 px-6 py-3" style={{ boxShadow: '0 0 20px rgba(0, 255, 0, 0.1)' }}>
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold font-mono retro-text tracking-wider select-none">
              [H.A.R.P]
            </h1>
            <div className="flex gap-1 text-sm">
              {['dashboard', 'sessions', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`
                  relative px-4 py-2 font-mono text-xs transition-all duration-200 uppercase tracking-wider border-2
                  ${
                    activeTab === tab
                      ? 'text-green-400 border-green-400 bg-green-400/10'
                      : 'text-cyan-400/50 border-cyan-400/30 hover:text-cyan-400 hover:border-cyan-400/50'
                  }
                `}
                style={activeTab === tab ? { boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)' } : {}}
                >
                  [{tab}]
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-black px-4 py-2 border-2 border-cyan-400/50 font-mono text-xs" style={{ boxShadow: '0 0 10px rgba(0, 255, 255, 0.2)' }}>
              <span className="text-cyan-400">TIME: </span>
              <span className="text-green-400 font-bold">45:30</span>
            </div>
            <Button
              variant="outline"
              className="bg-black border-2 border-red-400 text-red-400 hover:bg-red-400/10 font-mono text-xs px-6 py-2 tracking-wider transition-all"
              style={{ boxShadow: '0 0 10px rgba(255, 0, 0, 0.3)' }}
            >
              [END]
            </Button>
          </div>
        </div>
      </nav>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
