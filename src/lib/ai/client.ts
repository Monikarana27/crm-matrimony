// src/lib/ai/client.ts
// Single entry point for talking to the local LLM (Ollama).
// Every AI agent in this feature calls through this file — nothing else
// in the app imports Ollama directly.

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct-q4_K_M";

type CallLLMOptions = {
  prompt: string;
  temperature?: number; // lower = more consistent/deterministic output
};

/**
 * Sends a prompt to the local Ollama model and returns the raw text response.
 * Callers (agents) are responsible for parsing/validating the response
 * (usually with a Zod schema) since this function only handles the network call.
 */
export async function callLLM({ prompt, temperature = 0.3 }: CallLLMOptions): Promise<string> {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response as string;
}