import { z } from "zod";

export const meetingSchema = z.object({
  profileId: z.string().min(1, "Select a profile"),
  profileTwoId: z.string().optional(),
  type: z.enum(["FACE_TO_FACE", "TELE"]).default("TELE"),
  status: z.enum(["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"]).default("SCHEDULED"),
  outcome: z.enum(["PENDING", "POSITIVE", "NEGATIVE", "ONE_SIDED", "FOLLOW_UP_NEEDED"]).default("PENDING"),
  scheduledAt: z.string().min(1, "Select a date and time"),
  reminderAt: z.string().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

export type MeetingInput = z.infer<typeof meetingSchema>;
