import { z } from "zod";

export const planSchema = z.object({
  name: z.string().min(2, "Plan name is required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  currency: z.enum(["INR", "USD"]).default("INR"),
  durationDays: z.coerce.number().min(1, "Duration must be at least 1 day"),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export type PlanInput = z.infer<typeof planSchema>;