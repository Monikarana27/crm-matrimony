// Zod schema for the external search brief — used when internal matches
// are insufficient and the Service team needs to search Shaadi/Jeevansathi manually.

import { z } from "zod";

export const searchBriefSchema = z.object({
  mustHave: z
    .array(z.object({ field: z.string(), value: z.string() }))
    .min(1)
    .describe("Non-negotiable filters, e.g. religion, city"),
  niceToHave: z
    .array(z.object({ field: z.string(), value: z.string() }))
    .describe("Preferred but flexible filters, e.g. income bracket"),
  exampleQueries: z
    .array(z.string())
    .min(1)
    .describe("Example search filter strings an employee can type into Shaadi/Jeevansathi"),
});

export type SearchBriefAI = z.infer<typeof searchBriefSchema>;