// Zod schema for what the AI must return when explaining and pitching one match.
// pitch.agent.ts validates the LLM's output against this — if the model
// returns malformed JSON or missing fields, this throws instead of
// silently passing bad data to the UI.

import { z } from "zod";

export const matchResultSchema = z.object({
  reasoning: z
    .string()
    .min(10)
    .describe("2-3 sentence explanation of why this profile is a good match"),
  whatsappDraft: z
    .string()
    .min(10)
    .describe("Ready-to-send WhatsApp message introducing this match to the client"),
});

export type MatchResultAI = z.infer<typeof matchResultSchema>;