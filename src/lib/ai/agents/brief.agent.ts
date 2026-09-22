// Generates a structured search brief for the Service team to use manually
// on Shaadi.com / Jeevansathi when internal matches are insufficient.
// Called only when scoreAndRank() returns fewer than 5 usable candidates.

import { callLLM } from "@/lib/ai/client";
import { searchBriefSchema, type SearchBriefAI } from "@/lib/ai/schemas/search-brief";

type BriefInput = {
  clientName: string;
  preference: {
    city?: string | null;
    religion?: string | null;
    caste?: string | null;
    minAge?: number | null;
    maxAge?: number | null;
    profession?: string | null;
    annualIncome?: string | null;
  } | null;
};

export async function generateSearchBrief(input: BriefInput): Promise<SearchBriefAI> {
  const p = input.preference;

  const prompt = `You are helping a matchmaking service employee search for matches on external sites like Shaadi.com and Jeevansathi, because internal database matches were insufficient.

Client: ${input.clientName}
Stated preferences:
- City: ${p?.city ?? "not specified"}
- Religion: ${p?.religion ?? "not specified"}
- Caste: ${p?.caste ?? "not specified"}
- Age range: ${p?.minAge ?? "?"} - ${p?.maxAge ?? "?"}
- Profession: ${p?.profession ?? "not specified"}
- Annual income: ${p?.annualIncome ?? "not specified"}

Respond ONLY with valid JSON, no markdown, no preamble, in exactly this shape:
{
  "mustHave": [{"field": "string", "value": "string"}],
  "niceToHave": [{"field": "string", "value": "string"}],
  "exampleQueries": ["example filter string an employee could type into a search site"]
}

Only include mustHave/niceToHave items for preferences that were actually specified above — do not invent values for fields marked "not specified".`;

  const raw = await callLLM({ prompt, temperature: 0.4 });
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return searchBriefSchema.parse(parsed);
}