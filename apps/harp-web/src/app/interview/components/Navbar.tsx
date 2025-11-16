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
      <nav className="bg-gradient-to-b from-black via-black to-black/95 border-b border-white/10 px-6 py-4 backdrop-blur-sm shadow-lg shadow-white/5">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent select-none">
              H.A.R.P
            </h1>
            <div className="flex gap-1 text-sm">
              {['dashboard', 'sessions', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  className={`
                  relative px-4 py-2 font-medium transition-all duration-300 capitalize group
                  ${
                    activeTab === tab
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }
                `}
                >
                  {tab}
                  <span
                    className={`
                    absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-white/0 via-white to-white/0 transition-all duration-300
                    ${
                      activeTab === tab
                        ? 'w-full opacity-100'
                        : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-60'
                    }
                  `}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] px-4 py-2 rounded-lg border border-white/20 backdrop-blur-sm shadow-inner">
              <span className="text-gray-400 text-sm">Time: </span>
              <span className="font-mono text-white font-medium">45:30</span>
            </div>
            <Button
              variant="outline"
              className="bg-gradient-to-br from-white/10 to-white/5 hover:from-white hover:to-gray-100 hover:text-black border-white/40 hover:border-white shadow-lg hover:shadow-white/20 transition-all duration-300"
            >
              End Interview
            </Button>
          </div>
        </div>
      </nav>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
