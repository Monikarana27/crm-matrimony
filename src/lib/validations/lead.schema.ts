import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number with country code"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  source: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "PENDING", "INTERESTED", "NOT_INTERESTED", "CLOSED"]).default("NEW"),
  notes: z.string().optional(),
  followUpDate: z.string().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;