import { z } from "zod";

export const subscriptionSchema = z.object({
  profileId: z.string().min(1, "Select a profile"),
  planId: z.string().min(1, "Select a plan"),
  status: z.enum(["ACTIVE", "HOLD", "EXPIRED"]).default("ACTIVE"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
