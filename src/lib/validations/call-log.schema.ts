import { z } from "zod";

export const callLogSchema = z.object({
  profileId: z.string().min(1, "Select a profile"),
  outcome: z
    .enum(["CONNECTED", "NOT_ANSWERED", "BUSY", "INVALID_NUMBER", "FOLLOW_UP_NEEDED", "WRONG_NUMBER", "INTERESTED", "CALLBACK"])
    .default("CONNECTED"),
  notes: z.string().optional(),
  durationMinutes: z.string().optional(),
  durationSeconds: z.string().optional(),
  nextFollowUpAt: z.string().optional().or(z.literal("")),
  recordingUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  qualityScore: z.string().optional(),
});

export type CallLogInput = z.infer<typeof callLogSchema>;