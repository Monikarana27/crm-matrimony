import { z } from "zod";

export const salesTargetSchema = z.object({
  userId: z.string().min(1, "Select an employee"),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  targetAmount: z.coerce.number().min(0, "Target must be positive"),
});

export type SalesTargetInput = z.infer<typeof salesTargetSchema>;