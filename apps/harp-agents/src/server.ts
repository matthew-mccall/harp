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

  // Gradient
  GRADIENT_BASE_URL,        // this should be your AGENT_ENDPOINT, e.g. https://xx23jiwihvgqnj4wplccfivi.agents.do-ai.run
  GRADIENT_AGENT_AK,        // Agent Access Key from DigitalOcean UI

  // (you still have these in .env but we won't use them for now)
  GRADIENT_AGENT_ID,
  GRADIENT_API_KEY,

  GEMINI_API_KEY,
  TOOLS_FUNCTION_URL,
} = process.env;

// Build the full Agent chat-completions URL from the endpoint base
// Example: https://xx23jiwihvgqnj4wplccfivi.agents.do-ai.run/api/v1/chat/completions
const GRADIENT_AGENT_CHAT_URL = GRADIENT_BASE_URL
  ? `${GRADIENT_BASE_URL.replace(/\/$/, '')}/api/v1/chat/completions`
  : '';

if (!GRADIENT_AGENT_CHAT_URL || !GRADIENT_AGENT_AK || !TOOLS_FUNCTION_URL) {
  console.error(
    '❌ Missing env vars. Make sure GRADIENT_BASE_URL (agent endpoint), GRADIENT_AGENT_AK (agent access key), and TOOLS_FUNCTION_URL are set in .env'
  );
  process.exit(1);
}

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
 * 1. Ask orchestrator what to do.
 * 2. If it says call_gemini → call tools_function.
 * 3. Send last_gemini_answer back into orchestrator.
 * 4. Return the final orchestrator state + message_to_user.
 */
async function runToolCycle(baseState: {
  phase: any;
  agent_mode: any;
  user_message: any;
  last_gemini_answer: any;
  difficulty: any;
}) {
  // Step 1: ask orchestrator
  const step1 = await callOrchestrator(baseState);

  if (step1.next_action !== 'call_gemini') {
    // No Gemini call needed; just return whatever the agent decided
    return { orchestrator: step1, lastGeminiAnswer: null };
  }

  // Step 2: call tools_function (Gemini wrapper)
  const toolArgs = step1.tool_call?.arguments || {};
  const toolResult = await callToolsFunction(toolArgs);

  const lastGeminiAnswer =
    toolResult.answer ||
    toolResult.text ||
    toolResult.body?.answer ||
    JSON.stringify(toolResult);

  // Step 3: feed Gemini answer back to orchestrator
  const step2Input = {
    ...baseState,
    phase: step1.phase,
    agent_mode: step1.agent_mode,
    last_gemini_answer: lastGeminiAnswer,
    user_message: null,
  };

  const step2 = await callOrchestrator(step2Input);

  return {
    orchestrator: step2,
    lastGeminiAnswer,
  };
}

/**
 * POST /api/start-interview
 * body: { difficulty: "easy" | "medium" | "hard" }
 */
app.post('/api/start-interview', async (req, res) => {
  try {
    const { difficulty = 'easy' } = req.body || {};

    const baseState = {
      phase: 'planning',
      agent_mode: 'planner',
      user_message: `Start a ${difficulty} technical interview.`,
      last_gemini_answer: null,
      difficulty,
    };

    const { orchestrator, lastGeminiAnswer } = await runToolCycle(baseState);

    res.json({
      messageToUser: orchestrator.message_to_user,
      state: {
        phase: orchestrator.phase,
        agent_mode: orchestrator.agent_mode,
        difficulty,
        last_gemini_answer: lastGeminiAnswer,
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
 *   last_gemini_answer?: string
 * }
 */
app.post('/api/answer', async (req, res) => {
  try {
    const {
      userMessage,
      phase = 'interviewing',
      agent_mode = 'interviewer',
      difficulty = 'easy',
      last_gemini_answer = null,
    } = req.body || {};

    const answerState = {
      phase,
      agent_mode,
      user_message: userMessage,
      last_gemini_answer,
      difficulty,
    };

    const step1 = await callOrchestrator(answerState);

    if (step1.next_action === 'call_gemini') {
      const toolArgs = step1.tool_call?.arguments || {};
      const toolResult = await callToolsFunction(toolArgs);

      const geminiAnswer =
        toolResult.answer ||
        toolResult.text ||
        toolResult.body?.answer ||
        JSON.stringify(toolResult);

      const step2Input = {
        phase: step1.phase,
        agent_mode: step1.agent_mode,
        user_message: null,
        last_gemini_answer: geminiAnswer,
        difficulty,
      };

      const step2 = await callOrchestrator(step2Input);

      res.json({
        messageToUser: step2.message_to_user,
        state: {
          phase: step2.phase,
          agent_mode: step2.agent_mode,
          difficulty,
          last_gemini_answer: geminiAnswer,
        },
        rawOrchestrator: step2,
      });
    } else {
      // No Gemini call needed
      res.json({
        messageToUser: step1.message_to_user,
        state: {
          phase: step1.phase,
          agent_mode: step1.agent_mode,
          difficulty,
          last_gemini_answer,
        },
        rawOrchestrator: step1,
      });
    }
  } catch (err: any) {
    console.error('Error in /api/answer:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

app.get('/', (_req, res) => {
  res.send('Mock interview backend is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});