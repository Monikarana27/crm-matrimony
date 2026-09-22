import { z } from "zod";

export const paymentSchema = z.object({
  subscriptionId: z.string().min(1, "Select a subscription"),
  soldById: z.string().min(1, "Select who sold this"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "PAYU", "PAYPAL", "OTHER"]).default("OTHER"),
  status: z.enum(["PAID", "PENDING", "FAILED"]).default("PENDING"),
  transactionId: z.string().nullable().optional(),
  paymentLinkUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  currency: z.enum(["INR", "USD"]).default("INR"),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
