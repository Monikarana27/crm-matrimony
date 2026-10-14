import { z } from "zod";

// Treat null and "" as "not provided"
const emptyToUndefined = (v: unknown) =>
  v === null || v === "" ? undefined : v;

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

export const meetingSchema = z.object({
  profileId: z.string().min(1, "Select a profile"),
  profileTwoId: optionalString,
  type: z.preprocess(
    emptyToUndefined,
    z.enum(["FACE_TO_FACE", "TELE", "VC", "SUCCESS_STORY"]).default("TELE")
  ),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"]).default("SCHEDULED")
  ),
  outcome: z.preprocess(
    emptyToUndefined,
    z
      .enum(["PENDING", "POSITIVE", "NEGATIVE", "ONE_SIDED", "FOLLOW_UP_NEEDED"])
      .default("PENDING")
  ),
  scheduledAt: z.string().min(1, "Select a date and time"),
  reminderAt: optionalString,
  notes: optionalString,
  assignedToId: optionalString,
});

export type MeetingInput = z.infer<typeof meetingSchema>;
