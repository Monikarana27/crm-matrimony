import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

/**
 * Ensures an Achievement row exists for this specific payment, attributed
 * to the employee who sold it. Safe to call more than once for the same
 * payment (idempotent via the unique paymentId) — e.g. if a webhook is
 * delivered twice, or a payment's status is toggled back and forth.
 */
export async function upsertAchievementForPayment(
  tx: TxClient,
  params: {
    paymentId: string;
    soldById: string;
    amount: number;
    paidAt: Date;
  }
) {
  const month = params.paidAt.getMonth() + 1;
  const year = params.paidAt.getFullYear();

  await tx.achievement.upsert({
    where: { paymentId: params.paymentId },
    update: { amount: params.amount, month, year, userId: params.soldById },
    create: {
      paymentId: params.paymentId,
      userId: params.soldById,
      amount: params.amount,
      month,
      year,
      note: "Auto-logged from payment",
    },
  });
}

/**
 * Removes the Achievement tied to a payment, e.g. when a payment is
 * reversed/marked failed after having been marked paid. No-op if none
 * exists for this payment.
 */
export async function removeAchievementForPayment(tx: TxClient, paymentId: string) {
  await tx.achievement.deleteMany({ where: { paymentId } });
}
