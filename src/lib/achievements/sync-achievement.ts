import type { Prisma, PrismaClient } from "@prisma/client";

type TxClient = PrismaClient | Prisma.TransactionClient;

export const USD_INR_RATE_KEY = "usd_inr_rate";

async function getUsdInrRate(tx: TxClient): Promise<number | null> {
  const setting = await tx.systemSetting.findUnique({ where: { key: USD_INR_RATE_KEY } });
  const rate = setting ? Number(setting.value) : NaN;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/**
 * Converts an amount to INR using the CURRENT saved rate. Used only for
 * legacy read-time sums; new code should read Payment.amountInr instead.
 */
export async function toInrAmount(
  tx: TxClient,
  amount: number,
  currency?: string | null
): Promise<number> {
  if (!currency || currency === "INR") return amount;
  if (currency !== "USD") return amount;
  const rate = await getUsdInrRate(tx);
  if (rate === null) {
    console.error("[currency] usd_inr_rate missing/invalid; USD amount counted unconverted");
    return amount;
  }
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Freezes the INR value of a payment at the moment it becomes PAID.
 * Returns the INR amount. If the payment already has one, it is kept, so
 * repeat calls (double webhook, status toggles) never move the number.
 * If a USD rate isn't available, nothing is stored and the raw amount is
 * returned so a later backfill can fix it; a live payment is never blocked.
 */
export async function ensurePaymentInr(tx: TxClient, paymentId: string): Promise<number | null> {
  const p = await tx.payment.findUnique({
    where: { id: paymentId },
    select: { amount: true, currency: true, amountInr: true },
  });
  if (!p) return null;
  if (p.amountInr !== null && p.amountInr !== undefined) return p.amountInr;

  let rate: number | null = null;
  if (p.currency === "INR") rate = 1;
  else if (p.currency === "USD") rate = await getUsdInrRate(tx);

  if (rate === null) {
    console.error("[currency] no rate for payment", paymentId, p.currency, "- counted unconverted");
    return p.amount;
  }

  const amountInr = Math.round(p.amount * rate * 100) / 100;
  await tx.payment.update({
    where: { id: paymentId },
    data: { exchangeRate: rate, amountInr },
  });
  return amountInr;
}

/**
 * Ensures an Achievement row exists for this specific payment, attributed
 * to the employee who sold it. Safe to call more than once for the same
 * payment (idempotent via the unique paymentId). Achievement.amount is
 * always the payment's frozen INR amount.
 */
export async function upsertAchievementForPayment(
  tx: TxClient,
  params: {
    paymentId: string;
    soldById: string;
    amount: number;
    currency?: string | null;
    paidAt: Date;
  }
) {
  const month = params.paidAt.getMonth() + 1;
  const year = params.paidAt.getFullYear();
  const amountInr = (await ensurePaymentInr(tx, params.paymentId)) ?? params.amount;

  await tx.achievement.upsert({
    where: { paymentId: params.paymentId },
    update: { amount: amountInr, month, year, userId: params.soldById },
    create: {
      paymentId: params.paymentId,
      userId: params.soldById,
      amount: amountInr,
      month,
      year,
      note: "Auto-logged from payment",
    },
  });
}

/**
 * Removes the Achievement tied to a payment (e.g. reversed/marked failed
 * after being PAID) and clears the frozen INR value so a later re-PAID
 * snapshots a fresh rate.
 */
export async function removeAchievementForPayment(tx: TxClient, paymentId: string) {
  await tx.achievement.deleteMany({ where: { paymentId } });
  await tx.payment.updateMany({
    where: { id: paymentId },
    data: { exchangeRate: null, amountInr: null },
  });
}
