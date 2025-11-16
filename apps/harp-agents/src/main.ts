// server.ts
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/*
  This is a TypeScript version of the server. It preserves the CommonJS
  runtime style used in this package (package.json: "type": "commonjs"),
  while providing strict typing for request bodies and helper functions.
*/

import type { Request, Response } from 'express';

// Load and validate environment via centralized module
import {
  PORT,
  GRADIENT_AGENT_CHAT_URL,
  GRADIENT_AGENT_AK,
  TOOLS_FUNCTION_URL,
} from './env';

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Environment handled in ./env; required vars guaranteed at import time

// Types
type Difficulty = 'easy' | 'medium' | 'hard';

type AgentMode =
  | 'planner'
  | 'interviewer'
  | 'hint'
  | 'evaluator'
  // allow other strings while keeping helpful narrowing for known ones
  | (string & {});

interface HistoryEntry {
  role: string;
  content: string;
}

interface OrchestratorInputBase {
  phase: string;
  agent_mode: AgentMode;
  user_message: string | null;
  difficulty: Difficulty;
  history?: HistoryEntry[];
  transcript?: string | null;
  last_gemini_answer?: string | null;
}

interface ToolsFunctionArgs {
  tool?: string; // e.g., 'gemini_chat'
  agent_mode?: AgentMode;
  prompt?: string;
  extra?: Record<string, unknown>;
}

interface ToolsFunctionResultBody {
  answer?: string;
  text?: string;
  [key: string]: unknown;
}

interface ToolsFunctionResult {
  answer?: string;
  text?: string;
  body?: ToolsFunctionResultBody;
  [key: string]: unknown;
}

interface OrchestratorResponse {
  next_action?: 'call_gemini' | 'call_leetcode_api' | (string & {});
  tool_call?: { arguments?: ToolsFunctionArgs } | null;
  message_to_user?: string;
  phase?: string;
  agent_mode?: AgentMode;
  [key: string]: unknown;
}

function extractMessageFromToolResult(toolResult: ToolsFunctionResult): string {
  return (
    toolResult.answer ||
    toolResult.text ||
    toolResult.body?.answer ||
    toolResult.body?.text ||
    JSON.stringify(toolResult)
  );
}

class HttpError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, opts: { status: number; data: unknown }) {
    super(message);
    this.name = 'HttpError';
    this.status = opts.status;
    this.data = opts.data;
  }
}

type JsonInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

async function fetchJson<T = unknown>(url: string, init?: JsonInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers ?? {}),
  };

  const body = init?.body !== undefined ? JSON.stringify(init.body) : undefined;

  const res = await fetch(url, {
    method: init?.method ?? 'POST',
    headers,
    body,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new HttpError(`HTTP ${res.status} ${res.statusText}`, { status: res.status, data });
  }

  return data as T;
}

function getErrorLogMessage(err: unknown): string {
  if (err instanceof HttpError) {
    const data = err.data;
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data);
    } catch {
      return err.message;
    }
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    return typeof msg === 'string' ? msg : JSON.stringify(msg);
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Call the Gradient Orchestrator Agent via /api/v1/chat/completions
 *
 * We send the `inputPayload` as a JSON string in the user message, because
 * the agent prompt expects JSON input and returns JSON output.
 */
async function callOrchestrator(inputPayload: OrchestratorInputBase): Promise<OrchestratorResponse> {
  const body = {
    messages: [
      {
        role: 'user',
        content: JSON.stringify(inputPayload),
      },
    ],
    stream: false,
    include_functions_info: false,
    include_retrieval_info: false,
    include_guardrails_info: false,
  };

  const resData = await fetchJson<any>(GRADIENT_AGENT_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GRADIENT_AGENT_AK}`,
    },
    body,
  });

  // Agent response will be in choices[0].message.content as a string
  const content = (resData as any)?.choices?.[0]?.message?.content as unknown;

  if (!content) {
    throw new Error('No content returned from Gradient agent');
  }

  // Your agent always returns JSON, so parse it
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : (content as OrchestratorResponse);
    return parsed as OrchestratorResponse;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse agent JSON content:', content);
    throw e;
  }
}

/**
 * Call your DigitalOcean tools_function.
 * `args` should be exactly the "arguments" object your orchestrator returns:
 * {
 *   tool: 'gemini_chat',
 *   agent_mode: 'planner',
 *   prompt: '...',
 *   extra: { ... }
 * }
 */
async function callToolsFunction(args: ToolsFunctionArgs): Promise<ToolsFunctionResult> {
  const data = await fetchJson<ToolsFunctionResult>(TOOLS_FUNCTION_URL, {
    method: 'POST',
    body: args,
  });
  return data;
}

/**
 * Utility: run one "tool cycle":
 * - Calls the orchestrator once with baseState.
 * - If next_action is neither "call_gemini" nor "call_leetcode_api", returns { orchestrator, toolResult: null, messageToUser }.
 * - If next_action is one of those values, calls the tools_function with the provided arguments,
 *   computes messageToUser from the tool result, and returns { orchestrator, toolResult, messageToUser }.
 * - Does NOT feed tool text back into the agent.
 */
async function runToolCycle(baseState: OrchestratorInputBase): Promise<{
  orchestrator: OrchestratorResponse;
  toolResult: ToolsFunctionResult | null;
  messageToUser: string;
}> {
  // Step 1: ask orchestrator once
  const step1 = await callOrchestrator(baseState);

  if (step1.next_action !== 'call_gemini' && step1.next_action !== 'call_leetcode_api') {
    // No tool call needed; just return the orchestrator response
    return {
      orchestrator: step1,
      toolResult: null,
      messageToUser: step1.message_to_user || '',
    };
  }

  // Call tools_function (Gemini or LeetCode wrapper)
  const toolArgs = step1.tool_call?.arguments || {};
  const toolResult = await callToolsFunction(toolArgs);

  const messageToUser = extractMessageFromToolResult(toolResult);

  return {
    orchestrator: step1,
    toolResult,
    messageToUser,
  };
}

// Routes

// POST /api/start-interview
interface StartInterviewBody {
  difficulty?: Difficulty;
  history?: HistoryEntry[];
}

app.post(
  '/api/start-interview',
  async (req: Request<unknown, unknown, StartInterviewBody>, res: Response) => {
    try {
      const { difficulty = 'easy', history = [] } = req.body ?? {};

      const baseState: OrchestratorInputBase = {
        phase: 'planning',
        agent_mode: 'planner',
        user_message: `Start a ${difficulty} technical interview.`,
        difficulty,
        history,
      };

      const { orchestrator, toolResult, messageToUser } = await runToolCycle(baseState);

      res.json({
        messageToUser,
        state: {
          phase: orchestrator.phase,
          agent_mode: orchestrator.agent_mode,
          difficulty,
          lastToolResult: toolResult,
          history,
        },
        rawOrchestrator: orchestrator,
      });
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error in /api/start-interview:', getErrorLogMessage(err));
      res.status(500).json({ error: 'Failed to start interview' });
    }
  }
);

// POST /api/answer
interface AnswerBody {
  userMessage: string | null;
  phase?: string;
  agent_mode?: AgentMode;
  difficulty?: Difficulty;
  last_gemini_answer?: string | null; // kept for backward compatibility but not used
  history?: HistoryEntry[];
  transcript?: string | null;
}

app.post('/api/answer', async (req: Request<unknown, unknown, AnswerBody>, res: Response) => {
  try {
    const {
      userMessage,
      phase = 'interviewing',
      agent_mode = 'interviewer',
      difficulty = 'easy',
      // last_gemini_answer is ignored intentionally
      history = [],
      transcript = null,
    } = req.body ?? {};

    const answerState: OrchestratorInputBase = {
      phase,
      agent_mode,
      user_message: userMessage ?? null,
      difficulty,
      history,
      transcript,
    };

    const step1 = await callOrchestrator(answerState);

    if (step1.next_action === 'call_gemini' || step1.next_action === 'call_leetcode_api') {
      const toolArgs = step1.tool_call?.arguments || {};
      const toolResult = await callToolsFunction(toolArgs);
      const geminiAnswer = extractMessageFromToolResult(toolResult);

      res.json({
        messageToUser: geminiAnswer,
        state: {
          phase: step1.phase,
          agent_mode: step1.agent_mode,
          difficulty,
          lastToolResult: toolResult,
          history,
        },
        rawOrchestrator: step1,
      });
    } else {
      res.json({
        messageToUser: step1.message_to_user,
        state: {
          phase: step1.phase,
          agent_mode: step1.agent_mode,
          difficulty,
          lastToolResult: null,
          history,
        },
        rawOrchestrator: step1,
      });
    }
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error in /api/answer:', getErrorLogMessage(err));
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// POST /api/hint
interface HintBody {
  prompt?: string;
  difficulty?: Difficulty;
}

app.post('/api/hint', async (req: Request<unknown, unknown, HintBody>, res: Response) => {
  try {
    const { prompt = '', difficulty = 'easy' } = req.body ?? {};

    const toolArgs: ToolsFunctionArgs = {
      tool: 'gemini_chat',
      agent_mode: 'hint',
      prompt,
      extra: {
        difficulty,
      },
    };

    const toolResult = await callToolsFunction(toolArgs);
    const messageToUser = extractMessageFromToolResult(toolResult);

    res.json({
      messageToUser,
      rawToolResult: toolResult,
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error in /api/hint:', getErrorLogMessage(err));
    res.status(500).json({ error: 'Failed to generate hint' });
  }
});

// POST /api/evaluate
interface EvaluateBody {
  prompt?: string;
  difficulty?: Difficulty;
}

app.post(
  '/api/evaluate',
  async (req: Request<unknown, unknown, EvaluateBody>, res: Response) => {
    // eslint-disable-next-line no-console
    console.log('[API/EVALUATE] Incoming request body:', req.body);
    try {
      const { prompt = '', difficulty = 'easy' } = req.body ?? {};

      const toolArgs: ToolsFunctionArgs = {
        tool: 'gemini_chat',
        agent_mode: 'evaluator',
        prompt,
        extra: {
          difficulty,
        },
      };
      // eslint-disable-next-line no-console
      console.log('[API/EVALUATE] toolArgs:', toolArgs);

      const toolResult = await callToolsFunction(toolArgs);
      // eslint-disable-next-line no-console
      console.log('[API/EVALUATE] raw toolResult:', toolResult);

      const messageToUser = extractMessageFromToolResult(toolResult);

      res.json({
        messageToUser,
        rawToolResult: toolResult,
      });
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('[API/EVALUATE] Error:', getErrorLogMessage(err));
      res.status(500).json({ error: 'Failed to evaluate solution' });
    }
  }
);

app.get('/', (_req: Request, res: Response) => {
  res.send('Mock interview backend is running');
});

// PORT is already a number from env.ts
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
