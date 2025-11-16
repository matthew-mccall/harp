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
}

export default function ProblemPanel({ isCollapsed, onToggle }: ProblemPanelProps) {
  const [activeTab, setActiveTab] = useState<'description' | 'testcases'>('description');

  // Mock problem data - replace with actual data from props/API
  const problem = {
    title: "Two Sum",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]"
      }
    ],
    constraints: [
      "2 <= nums.length <= 10⁴",
      "-10⁹ <= nums[i] <= 10⁹",
      "-10⁹ <= target <= 10⁹",
      "Only one valid answer exists."
    ]
  };

  const testCases: TestCase[] = [
    { input: "[2,7,11,15], 9", expectedOutput: "[0,1]", passed: true },
    { input: "[3,2,4], 6", expectedOutput: "[1,2]", passed: false },
    { input: "[3,3], 6", expectedOutput: "[0,1]", passed: undefined }
  ];

  return (
    <div 
      className={`relative bg-black/40 backdrop-blur-sm border-r border-white/10 flex flex-col overflow-hidden transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-96'
      }`}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={onToggle}
        className="absolute top-4 right-2 z-10 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
        title={isCollapsed ? "Expand problem panel" : "Collapse problem panel"}
      >
        <svg
          className={`w-4 h-4 text-gray-400 group-hover:text-white transition-transform ${
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
            className="text-gray-400 text-sm font-medium tracking-wider"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            PROBLEM
          </div>
        </div>
      ) : (
        /* Expanded State - Full Content */
        <>
          {/* Header */}
          <div className="p-4 border-b border-white/10 pr-12">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">{problem.title}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                problem.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                problem.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {problem.difficulty}
              </span>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('description')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'description'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('testcases')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'testcases'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Test Cases
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'description' ? (
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Problem</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{problem.description}</p>
                </div>

                {/* Examples */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Examples</h3>
                  <div className="space-y-4">
                    {problem.examples.map((example, index) => (
                      <ExampleBlock key={index} example={example} index={index + 1} />
                    ))}
                  </div>
                </div>

                {/* Constraints */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Constraints</h3>
                  <ul className="space-y-1">
                    {problem.constraints.map((constraint, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start">
                        <span className="text-cyan-400 mr-2">•</span>
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
    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
      <div className="text-xs font-semibold text-cyan-400 mb-2">Example {index}</div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-400">Input: </span>
          <code className="text-gray-200 bg-black/30 px-2 py-1 rounded">{example.input}</code>
        </div>
        <div>
          <span className="text-gray-400">Output: </span>
          <code className="text-gray-200 bg-black/30 px-2 py-1 rounded">{example.output}</code>
        </div>
        {example.explanation && (
          <div>
            <span className="text-gray-400">Explanation: </span>
            <span className="text-gray-300">{example.explanation}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TestCaseItem({ testCase, index }: { testCase: TestCase; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">Test Case {index}</span>
          {testCase.passed !== undefined && (
            <span className={`w-2 h-2 rounded-full ${
              testCase.passed ? 'bg-green-400' : 'bg-red-400'
            }`} />
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-sm border-t border-white/10 pt-2">
          <div>
            <span className="text-gray-400">Input: </span>
            <code className="text-gray-200 bg-black/30 px-2 py-1 rounded text-xs">{testCase.input}</code>
          </div>
          <div>
            <span className="text-gray-400">Expected: </span>
            <code className="text-gray-200 bg-black/30 px-2 py-1 rounded text-xs">{testCase.expectedOutput}</code>
          </div>
          {testCase.passed !== undefined && (
            <div className={`text-xs font-medium ${testCase.passed ? 'text-green-400' : 'text-red-400'}`}>
              {testCase.passed ? '✓ Passed' : '✗ Failed'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
