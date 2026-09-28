import type { Prisma, PrismaClient } from "@prisma/client";
import { toInrAmount } from "@/lib/achievements/sync-achievement";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Sums payments matching `where` as a single INR figure.
 * Uses each payment's frozen amountInr (rate fixed when it was marked PAID),
 * so historical totals never move with the daily rate. Rows that somehow
 * lack a frozen value fall back to the current rate and are logged.
 */
export async function sumPaymentsInr(
  db: Db,
  where: Prisma.PaymentWhereInput
): Promise<number> {
  const frozen = await db.payment.aggregate({
    where: { AND: [where, { amountInr: { not: null } }] },
    _sum: { amountInr: true },
  });
  let total = frozen._sum.amountInr ?? 0;

  const unfrozen = await db.payment.groupBy({
    by: ["currency"],
    where: { AND: [where, { amountInr: null }] },
    _sum: { amount: true },
  });
  for (const g of unfrozen) {
    const amt = g._sum.amount ?? 0;
    if (amt === 0) continue;
    console.error("[currency] payments without frozen amountInr in sum:", g.currency, amt);
    total += await toInrAmount(db, amt, g.currency);
  }
  return total;
}
