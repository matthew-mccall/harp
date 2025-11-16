'use client';

import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  onRunCode?: (code: string) => void | Promise<void>;
  onCodeChange?: (code: string) => void;
}

export default function CodeEditor({ onRunCode, onCodeChange }: CodeEditorProps) {
  const [code, setCode] = useState(`def two_sum(nums, target):
    # Your code here
    pass`);
  const [isWhiteboardMode, setIsWhiteboardMode] = useState(false);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Define custom retro theme
    monaco.editor.defineTheme('retro-terminal', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: '00ff00' }, // Default text - green
        { token: 'comment', foreground: '00ffff', fontStyle: 'italic' }, // Comments - cyan
        { token: 'keyword', foreground: '00ff00', fontStyle: 'bold' }, // Keywords - bright green
        { token: 'string', foreground: '00ffff' }, // Strings - cyan
        { token: 'number', foreground: '00ff00' }, // Numbers - green
        { token: 'regexp', foreground: '00ffff' }, // Regex - cyan
        { token: 'operator', foreground: '00ff00' }, // Operators - green
        { token: 'namespace', foreground: '00ffff' }, // Namespaces - cyan
        { token: 'type', foreground: '00ff00' }, // Types - green
        { token: 'struct', foreground: '00ffff' }, // Structs - cyan
        { token: 'class', foreground: '00ff00', fontStyle: 'bold' }, // Classes - bright green
        { token: 'function', foreground: '00ffff' }, // Functions - cyan
        { token: 'variable', foreground: '00ff00' }, // Variables - green
        { token: 'constant', foreground: '00ff00', fontStyle: 'bold' }, // Constants - bright green
        { token: 'parameter', foreground: '00ffff' }, // Parameters - cyan
        { token: 'property', foreground: '00ff00' }, // Properties - green
        { token: 'label', foreground: '00ffff' }, // Labels - cyan
      ],
      colors: {
        'editor.background': '#000000', // Pure black background
        'editor.foreground': '#00ff00', // Green foreground
        'editor.lineHighlightBackground': '#001a00', // Dark green highlight
        'editor.selectionBackground': '#003300', // Green selection
        'editor.inactiveSelectionBackground': '#002200', // Darker green inactive selection
        'editorCursor.foreground': '#00ff00', // Green cursor
        'editorLineNumber.foreground': '#00ff0080', // Semi-transparent green line numbers
        'editorLineNumber.activeForeground': '#00ff00', // Bright green active line number
        'editorIndentGuide.background': '#00ff0020', // Very faint green indent guides
        'editorIndentGuide.activeBackground': '#00ff0040', // Faint green active indent guides
        'editorWhitespace.foreground': '#00ff0030', // Very faint green whitespace
        'editorBracketMatch.background': '#003300', // Green bracket match background
        'editorBracketMatch.border': '#00ff00', // Green bracket match border
      },
    });
    
    // Apply the theme
    monaco.editor.setTheme('retro-terminal');
  };

  const handleRunCode = async () => {
    console.log('🔘 Button clicked, calling onRunCode');
    if (onRunCode) {
      await onRunCode(code);
    }
  };

  // Calculate line numbers for whiteboard mode
  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex-1 bg-black border-r-2 border-b-2 border-green-400/30 overflow-hidden flex flex-col">
      <div className="bg-black border-b-2 border-green-400/30 px-4 py-2 flex items-center justify-between no-crt-lines" style={{ boxShadow: '0 0 15px rgba(0, 255, 0, 0.1)' }}>
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-mono text-xs">[IDE]</span>
          <div className="w-px h-4 bg-green-400/30" />
          <span className="text-cyan-400 font-mono text-xs">solution.py</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCode}
            className="text-xs text-black bg-green-400 hover:bg-green-300 border-2 border-green-400 px-6 py-1.5 font-mono font-bold transition-all duration-200 tracking-wider"
            style={{ boxShadow: '0 0 15px rgba(0, 255, 0, 0.5)' }}
          >
            &gt; RUN
          </button>
          <button
            onClick={() => setIsWhiteboardMode(!isWhiteboardMode)}
            className={`text-xs font-mono px-3 py-1.5 border-2 transition-all duration-200 ${
              isWhiteboardMode 
                ? 'text-cyan-400 border-cyan-400 bg-cyan-400/10' 
                : 'text-green-400/50 border-green-400/30 hover:text-green-400 hover:border-green-400/50'
            }`}
          >
            {isWhiteboardMode ? '[WB]' : '[IDE]'}
          </button>
          <div className="text-xs text-cyan-400 border-2 border-cyan-400/50 px-3 py-1.5 font-mono">
            [PY]
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden no-crt-lines">
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
              onChange={(e) => {
                const newCode = e.target.value;
                setCode(newCode);
                if (onCodeChange) {
                  console.log('[CodeEditor] onCodeChange (whiteboard), length =', newCode.length);
                  onCodeChange(newCode);
                }
              }}
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
            onChange={(value) => {
              const newCode = value || '';
              setCode(newCode);
              if (onCodeChange) {
                console.log('[CodeEditor] onCodeChange (IDE), length =', newCode.length);
                onCodeChange(newCode);
              }
            }}
            onMount={handleEditorDidMount}
            theme="retro-terminal"
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