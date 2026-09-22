// Takes one candidate profile + the client's preference, asks the LLM to
// explain why it's a good match and draft a WhatsApp message.
// Validates the response against matchResultSchema before returning it —
// if the model returns garbage, this throws and route.ts will handle it
// (skip this candidate rather than showing broken text to the Service team).

import { callLLM } from "@/lib/ai/client";
import { matchResultSchema, type MatchResultAI } from "@/lib/ai/schemas/match-result";

type PitchInput = {
  clientName: string;
  clientCity: string | null;
  candidateName: string;
  candidateCity: string | null;
  candidateProfession: string | null;
  candidateAge: number | null;
  matchScore: number;
};

export async function generatePitch(input: PitchInput): Promise<MatchResultAI> {
  const prompt = `You are helping a matchmaking service explain a match to their team, and draft a WhatsApp message to a client.

Client: ${input.clientName}, based in ${input.clientCity ?? "unspecified city"}.
Candidate match: ${input.candidateName}, age ${input.candidateAge ?? "unspecified"}, ${input.candidateProfession ?? "profession unspecified"}, based in ${input.candidateCity ?? "unspecified city"}.
Compatibility score: ${input.matchScore}/100.

Respond ONLY with valid JSON, no markdown, no preamble, in exactly this shape:
{
  "reasoning": "2-3 sentence explanation of why this is a good match, written for an internal matchmaking team member",
  "whatsappDraft": "A warm, professional WhatsApp message to send the client introducing this match, using the candidate's first name only, no surname, no phone number or contact info included"
}`;

  const raw = await callLLM({ prompt, temperature: 0.4 });

  // Model sometimes wraps JSON in markdown code fences despite instructions — strip if present
  const cleaned = raw.replace(/```json|```/g, "").trim();

  const parsed = JSON.parse(cleaned);
  return matchResultSchema.parse(parsed);
}