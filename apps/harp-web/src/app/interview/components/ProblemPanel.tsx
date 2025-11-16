'use client';

import { useState } from 'react';

interface Example {
  input: string;
  output: string;
  explanation?: string;
}

interface TestCase {
  input: string;
  expectedOutput: string;
  passed?: boolean;
}

interface ProblemPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  interviewState?: any;
  problemText?: string;
}

export default function ProblemPanel({ isCollapsed, onToggle, interviewState, problemText }: ProblemPanelProps) {
  const [activeTab, setActiveTab] = useState<'description' | 'testcases'>('description');

  // Extract problem data from interview state or use defaults
  const difficulty = interviewState?.difficulty || 'medium';
  const displayDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  
  // Use the actual problem text from the interview
  const problemDescription = problemText || 'Waiting for interview to start...';
  
  const problem = {
    title: "Coding Challenge",
    difficulty: displayDifficulty,
    description: problemDescription,
    examples: [] as Example[],
    constraints: [] as string[]
  };

  // Test cases can be extracted from interview state in the future
  const testCases: TestCase[] = [];

  return (
    <div 
      className={`relative bg-black border-r-2 border-green-400/30 flex flex-col overflow-hidden transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-96'
      }`}
      style={{ boxShadow: isCollapsed ? 'none' : '0 0 20px rgba(0, 255, 0, 0.1)' }}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={onToggle}
        className="absolute top-4 right-2 z-10 p-2 bg-black border-2 border-cyan-400/50 hover:border-cyan-400 transition-all group"
        title={isCollapsed ? "Expand problem panel" : "Collapse problem panel"}
        style={{ boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)' }}
      >
        <svg
          className={`w-4 h-4 text-cyan-400 transition-transform ${
            isCollapsed ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {isCollapsed ? (
        /* Collapsed State - Vertical Text */
        <div className="flex items-center justify-center h-full">
          <div 
            className="text-green-400 text-xs font-mono tracking-wider"
            style={{ 
              writingMode: 'vertical-rl', 
              transform: 'rotate(180deg)',
              textShadow: '0 0 8px rgba(0, 255, 0, 0.8)'
            }}
          >
            [PROBLEM]
          </div>
        </div>
      ) : (
        /* Expanded State - Full Content */
        <>
          {/* Header */}
          <div className="p-4 border-b-2 border-green-400/30 pr-12 bg-black/50">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-cyan-400 font-mono">[PROBLEM.SYS]</div>
              <span className={`px-2 py-1 text-xs font-mono border-2 ${
                problem.difficulty === 'Easy' ? 'border-green-400 text-green-400' :
                problem.difficulty === 'Medium' ? 'border-yellow-400 text-yellow-400' :
                'border-red-400 text-red-400'
              }`} style={{ 
                boxShadow: problem.difficulty === 'Easy' ? '0 0 8px rgba(0, 255, 0, 0.3)' :
                           problem.difficulty === 'Medium' ? '0 0 8px rgba(255, 255, 0, 0.3)' :
                           '0 0 8px rgba(255, 0, 0, 0.3)'
              }}>
                {problem.difficulty.toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg font-bold text-green-400 font-mono mb-3" style={{ textShadow: '0 0 8px rgba(0, 255, 0, 0.6)' }}>
              {problem.title}
            </h2>

            {/* Tab Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('description')}
                className={`flex-1 py-2 px-4 text-xs font-mono transition-all border-2 ${
                  activeTab === 'description'
                    ? 'bg-green-400/10 text-green-400 border-green-400'
                    : 'text-cyan-400/50 border-cyan-400/30 hover:text-cyan-400 hover:border-cyan-400/50'
                }`}
                style={ activeTab === 'description' ? { boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)' } : {}}
              >
                [DESC]
              </button>
              <button
                onClick={() => setActiveTab('testcases')}
                className={`flex-1 py-2 px-4 text-xs font-mono transition-all border-2 ${
                  activeTab === 'testcases'
                    ? 'bg-green-400/10 text-green-400 border-green-400'
                    : 'text-cyan-400/50 border-cyan-400/30 hover:text-cyan-400 hover:border-cyan-400/50'
                }`}
                style={ activeTab === 'testcases' ? { boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)' } : {}}
              >
                [TESTS]
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'description' ? (
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-xs font-mono text-cyan-400 mb-2">&gt; PROBLEM_STATEMENT</h3>
                  <p className="text-sm text-green-400/80 leading-relaxed font-mono">{problem.description}</p>
                </div>

                {/* Examples */}
                <div>
                  <h3 className="text-xs font-mono text-cyan-400 mb-3">&gt; EXAMPLES</h3>
                  <div className="space-y-4">
                    {problem.examples.map((example, index) => (
                      <ExampleBlock key={index} example={example} index={index + 1} />
                    ))}
                  </div>
                </div>

                {/* Constraints */}
                <div>
                  <h3 className="text-xs font-mono text-cyan-400 mb-2">&gt; CONSTRAINTS</h3>
                  <ul className="space-y-1">
                    {problem.constraints.map((constraint, index) => (
                      <li key={index} className="text-sm text-green-400/70 flex items-start font-mono">
                        <span className="text-cyan-400 mr-2">//</span>
                        <span>{constraint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {testCases.map((testCase, index) => (
                  <TestCaseItem key={index} testCase={testCase} index={index + 1} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ExampleBlock({ example, index }: { example: Example; index: number }) {
  return (
    <div className="bg-black border-2 border-green-400/30 p-3" style={{ boxShadow: '0 0 10px rgba(0, 255, 0, 0.15)' }}>
      <div className="text-xs font-mono text-cyan-400 mb-2">// EXAMPLE_{index}</div>
      <div className="space-y-2 text-xs font-mono">
        <div>
          <span className="text-green-400">INPUT: </span>
          <code className="text-cyan-400 bg-black/50 px-2 py-1 border border-cyan-400/30">{example.input}</code>
        </div>
        <div>
          <span className="text-green-400">OUTPUT: </span>
          <code className="text-cyan-400 bg-black/50 px-2 py-1 border border-cyan-400/30">{example.output}</code>
        </div>
        {example.explanation && (
          <div>
            <span className="text-green-400">NOTE: </span>
            <span className="text-green-400/70">{example.explanation}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TestCaseItem({ testCase, index }: { testCase: TestCase; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-black border-2 border-cyan-400/30 overflow-hidden" style={{ boxShadow: '0 0 10px rgba(0, 255, 255, 0.15)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-black hover:bg-green-400/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-cyan-400">[TEST_{index}]</span>
          {testCase.passed !== undefined && (
            <span className={`text-xs font-mono ${
              testCase.passed ? 'text-green-400' : 'text-red-400'
            }`}>
              {testCase.passed ? '[PASS]' : '[FAIL]'}
            </span>
          )}
        </div>
        <svg
          className={`w-3 h-3 text-cyan-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs font-mono border-t-2 border-cyan-400/30 pt-2 bg-black/50">
          <div>
            <span className="text-green-400">INPUT: </span>
            <code className="text-cyan-400 bg-black px-2 py-1 border border-cyan-400/30">{testCase.input}</code>
          </div>
          <div>
            <span className="text-green-400">EXPECT: </span>
            <code className="text-cyan-400 bg-black px-2 py-1 border border-cyan-400/30">{testCase.expectedOutput}</code>
          </div>
          {testCase.passed !== undefined && (
            <div className={`text-xs font-mono ${testCase.passed ? 'text-green-400' : 'text-red-400'}`}>
              {testCase.passed ? '&gt; STATUS: PASSED' : '&gt; STATUS: FAILED'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
