// Centralized, type-safe environment handling for the agents service.
// Loads .env, validates required variables, and exports typed constants.

import 'dotenv/config';

// Grab from process.env once
const env = process.env as Record<string, string | undefined>;

// Parse a port number with fallback to 4000
function parsePort(v: string | undefined, fallback = 4000): number {
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Required envs for this service
const REQUIRED_VARS = [
  'GRADIENT_BASE_URL',
  'GRADIENT_AGENT_AK',
  'TOOLS_FUNCTION_URL',
];

const missing = REQUIRED_VARS.filter((k) => !env[k] || env[k]?.trim() === '');
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `❌ Missing env vars: ${missing.join(', ')}\n` +
      'Make sure GRADIENT_BASE_URL (agent endpoint), GRADIENT_AGENT_AK (agent access key), and TOOLS_FUNCTION_URL are set in .env'
  );
  // Exit early to avoid undefined usage at runtime
  process.exit(1);
}

// At this point required variables exist (process exited otherwise)
const _GRADIENT_BASE_URL = env.GRADIENT_BASE_URL as string; // guaranteed
const _GRADIENT_AGENT_AK = env.GRADIENT_AGENT_AK as string; // guaranteed
const _TOOLS_FUNCTION_URL = env.TOOLS_FUNCTION_URL as string; // guaranteed

// Derived URL for the Gradient Agent chat endpoint
const _GRADIENT_AGENT_CHAT_URL = `${_GRADIENT_BASE_URL.replace(/\/$/, '')}/api/v1/chat/completions`;

export const PORT: number = parsePort(env.PORT, 4000);
export const GRADIENT_BASE_URL: string = _GRADIENT_BASE_URL;
export const GRADIENT_AGENT_AK: string = _GRADIENT_AGENT_AK;
export const TOOLS_FUNCTION_URL: string = _TOOLS_FUNCTION_URL;
export const GRADIENT_AGENT_CHAT_URL: string = _GRADIENT_AGENT_CHAT_URL;

// Reserved/optional for future use; keep exported with precise types
export const GRADIENT_AGENT_ID: string | undefined = env.GRADIENT_AGENT_ID;
export const GRADIENT_API_KEY: string | undefined = env.GRADIENT_API_KEY;
export const GEMINI_API_KEY: string | undefined = env.GEMINI_API_KEY;
