'use client';

import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  onRunCode?: (code: string) => void;
}

export default function CodeEditor({ onRunCode }: CodeEditorProps) {
  const [code, setCode] = useState(`def two_sum(nums, target):
    # Your code here
    pass`);
  const [isWhiteboardMode, setIsWhiteboardMode] = useState(false);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleRunCode = () => {
    if (onRunCode) {
      onRunCode(code);
    }
  };

  // Calculate line numbers for whiteboard mode
  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex-1 bg-gradient-to-br from-black via-black to-gray-950 border-r border-b border-white/10 overflow-hidden flex flex-col shadow-2xl shadow-white/5">
      <div className="bg-gradient-to-r from-white/5 to-transparent border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-sm">
        <div className="flex gap-2.5">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500/80 to-red-600/60 border border-red-400/30 shadow-sm shadow-red-500/20"></div>
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-500/80 to-yellow-600/60 border border-yellow-400/30 shadow-sm shadow-yellow-500/20"></div>
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500/80 to-green-600/60 border border-green-400/30 shadow-sm shadow-green-500/20"></div>
        </div>
        <span className="text-sm text-white font-medium tracking-wide">solution.py</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCode}
            className="text-xs text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border border-green-500/50 px-4 py-1.5 rounded-md shadow-lg shadow-green-500/20 transition-all duration-200 font-medium"
          >
            ▶ Run Code
          </button>
          <button
            onClick={() => setIsWhiteboardMode(!isWhiteboardMode)}
            className="text-xs text-gray-400 hover:text-white bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 border border-white/20 px-3 py-1.5 rounded-md shadow-inner transition-all duration-200"
          >
            {isWhiteboardMode ? '📝 Whiteboard' : '💻 IDE'}
          </button>
          <div className="text-xs text-gray-300 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 px-3 py-1.5 rounded-md shadow-inner">
            Python
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {isWhiteboardMode ? (
          <div className="flex-1 flex h-full">
            <div className="bg-[#1e1e1e] border-r border-white/10 px-4 py-4 font-mono text-sm text-gray-600 select-none overflow-hidden">
              {lineNumbers.map((num) => (
                <div key={num} className="leading-relaxed text-right">
                  {num}
                </div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 font-mono text-sm bg-[#1e1e1e] overflow-auto leading-relaxed resize-none focus:outline-none px-4 py-4 text-gray-200"
              style={{ 
                tabSize: 4,
                lineHeight: '1.5'
              }}
              spellCheck={false}
            />
          </div>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="python"
            value={code}
            onChange={(value) => setCode(value || '')}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 },
            }}
          />
        )}
      </div>
    </div>
  );
}