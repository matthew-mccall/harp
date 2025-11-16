// server.ts
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const {
  PORT = 4000,
  GRADIENT_BASE_URL,       
  GRADIENT_AGENT_AK,
  GRADIENT_AGENT_ID,
  GRADIENT_API_KEY,
  GEMINI_API_KEY,
  TOOLS_FUNCTION_URL,
} = process.env;

const GRADIENT_AGENT_CHAT_URL = GRADIENT_BASE_URL
  ? `${GRADIENT_BASE_URL.replace(/\/$/, '')}/api/v1/chat/completions`
  : '';

if (!GRADIENT_AGENT_CHAT_URL || !GRADIENT_AGENT_AK || !TOOLS_FUNCTION_URL) {
  console.error(
    '❌ Missing env vars. Make sure GRADIENT_BASE_URL (agent endpoint), GRADIENT_AGENT_AK (agent access key), and TOOLS_FUNCTION_URL are set in .env'
  );
  process.exit(1);
}

// Long-term conversation memory is handled on the client side by persisting state.history and sending it back on each /api/answer call.
// Gemini itself remains stateless per request, receiving only what it needs (e.g., the latest question/answer, transcript, or summarized history) via orchestrator prompts.

/**
 * Call the Gradient Orchestrator Agent via /api/v1/chat/completions
 *
 * We send the `inputPayload` as a JSON string in the user message, because
 * your agent prompt expects JSON input and returns JSON output.
 *
 * inputPayload = {
 *   user_message: "Start an easy technical interview",
 *   phase: "planning",
 *   agent_mode: "planner",
 *   last_gemini_answer: null,
 *   difficulty: "easy"
 * }
 */
async function callOrchestrator(inputPayload: {
  phase: any;
  agent_mode: any;
  user_message: any;
  last_gemini_answer: any;
  difficulty: any;
}) {
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

  const res = await axios.post(GRADIENT_AGENT_CHAT_URL, body, {
    headers: {
      Authorization: `Bearer ${GRADIENT_AGENT_AK}`,
      'Content-Type': 'application/json',
    },
  });

  // Agent response will be in choices[0].message.content as a string
  const content = res.data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned from Gradient agent');
  }

  // Your agent always returns JSON, so parse it
  let parsed;
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (e) {
    console.error('Failed to parse agent JSON content:', content);
    throw e;
  }

  return parsed;
}

/**
 * Call your DigitalOcean tools_function
 * `args` should be exactly the "arguments" object your orchestrator returns:
 * {
 *   tool: "gemini_chat",
 *   agent_mode: "planner",
 *   prompt: "...",
 *   extra: { ... }
 * }
 */
async function callToolsFunction(args: any) {
  const res = await axios.post(TOOLS_FUNCTION_URL, args, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Adjust this to match what you saw in the Functions test panel
  return res.data;
}

/**
 * Utility: run one "tool cycle":
 * - Calls the orchestrator once with baseState.
 * - If next_action is neither "call_gemini" nor "call_leetcode_api", returns { orchestrator, toolResult: null, messageToUser }.
 * - If next_action is "call_gemini" or "call_leetcode_api", calls the tools_function with the provided arguments,
 *   computes messageToUser from the tool result, and returns { orchestrator, toolResult, messageToUser }.
 * - Does NOT feed tool text back into the agent.
 * - The LeetCode question or Gemini answer should be taken from messageToUser/toolResult on the backend/front-end side.
 */
async function runToolCycle(baseState: {
  phase: any;
  agent_mode: any;
  user_message: any;
  last_gemini_answer: any;
  difficulty: any;
}) {
  // Step 1: ask orchestrator once
  const step1 = await callOrchestrator(baseState);

  if (step1.next_action !== 'call_gemini' && step1.next_action !== 'call_leetcode_api') {
    // No tool call needed; just return the orchestrator response
    return { orchestrator: step1, toolResult: null, messageToUser: step1.message_to_user || '' };
  }

  // Call tools_function (Gemini or LeetCode wrapper)
  const toolArgs = step1.tool_call?.arguments || {};
  const toolResult = await callToolsFunction(toolArgs);

  const messageToUser =
    toolResult.answer ||
    toolResult.text ||
    toolResult.body?.answer ||
    toolResult.body?.text ||
    JSON.stringify(toolResult);

  return {
    orchestrator: step1,
    toolResult,
    messageToUser,
  };
}

/**
 * POST /api/start-interview
 * body: { difficulty: "easy" | "medium" | "hard", history?: Array<{ role: string; content: string }> }
 * The client can optionally send an initial `history` array for conversation memory,
 * but typically a new interview starts with empty history.
 */
app.post('/api/start-interview', async (req, res) => {
  try {
    const { difficulty = 'easy', history = [] } = req.body || {};

    const baseState = {
      phase: 'planning',
      agent_mode: 'planner',
      user_message: `Start a ${difficulty} technical interview.`,
      difficulty,
      history,
    };

    // Run one tool cycle: orchestrator + optional tools_function call
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
  } catch (err: any) {
    console.error('Error in /api/start-interview:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

/**
 * POST /api/answer
 * body: {
 *   userMessage: string,
 *   phase: string,
 *   agent_mode: string,
 *   difficulty?: string,
 *   last_gemini_answer?: string,
 *   history?: Array<{ role: string; content: string }>,
 *   transcript?: string
 * }
 */
app.post('/api/answer', async (req, res) => {
  try {
    const {
      userMessage,
      phase = 'interviewing',
      agent_mode = 'interviewer',
      difficulty = 'easy',
      last_gemini_answer = null, // keep reading for backward compatibility but do not pass to orchestrator
      history = [],
      transcript = null,
    } = req.body || {};

    // Build answerState including history and transcript so the orchestrator receives them
    const answerState = {
      phase,
      agent_mode,
      user_message: userMessage,
      difficulty,
      history,
      transcript,
    };

    const step1 = await callOrchestrator(answerState);

    if (step1.next_action === 'call_gemini' || step1.next_action === 'call_leetcode_api') {
      // Call tools_function (Gemini or LeetCode wrapper)
      const toolArgs = step1.tool_call?.arguments || {};
      const toolResult = await callToolsFunction(toolArgs);

      const geminiAnswer =
        toolResult.answer ||
        toolResult.text ||
        toolResult.body?.answer ||
        toolResult.body?.text ||
        JSON.stringify(toolResult);

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
      // No tool call needed; just return the orchestrator response
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
  } catch (err: any) {
    console.error('Error in /api/answer:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

/**
 * POST /api/hint
 * body: { prompt: string, difficulty?: string }
 *
 * This bypasses the orchestrator and directly asks Gemini (via tools_function)
 * for a short, single-problem hint using agent_mode = "hint".
 */
app.post('/api/hint', async (req, res) => {
  try {
    const { prompt = '', difficulty = 'easy' } = req.body || {};

    const toolArgs = {
      tool: 'gemini_chat',
      agent_mode: 'hint',
      prompt,
      extra: {
        difficulty,
      },
    };

    const toolResult = await callToolsFunction(toolArgs);

    const messageToUser =
      toolResult.answer ||
      toolResult.text ||
      toolResult.body?.answer ||
      toolResult.body?.text ||
      JSON.stringify(toolResult);

    res.json({
      messageToUser,
      rawToolResult: toolResult,
    });
  } catch (err: any) {
    console.error('Error in /api/hint:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to generate hint' });
  }
});

/**
 * POST /api/evaluate
 * body: { prompt: string, difficulty?: string }
 *
 * This bypasses the orchestrator and directly asks Gemini (via tools_function)
 * for a solution evaluation using agent_mode = "evaluator".
 */
app.post('/api/evaluate', async (req, res) => {
  console.log('[API/EVALUATE] Incoming request body:', req.body);
  try {
    const { prompt = '', difficulty = 'easy' } = req.body || {};

    const toolArgs = {
      tool: 'gemini_chat',
      agent_mode: 'evaluator',
      prompt,
      extra: {
        difficulty,
      },
    };
    console.log('[API/EVALUATE] toolArgs:', toolArgs);

    const toolResult = await callToolsFunction(toolArgs);
    console.log('[API/EVALUATE] raw toolResult:', toolResult);

    const messageToUser =
      toolResult.answer ||
      toolResult.text ||
      toolResult.body?.answer ||
      toolResult.body?.text ||
      JSON.stringify(toolResult);

    res.json({
      messageToUser,
      rawToolResult: toolResult,
    });
  } catch (err: any) {
    console.error('[API/EVALUATE] Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to evaluate solution' });
  }
});

app.get('/', (_req, res) => {
  res.send('Mock interview backend is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});