import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export type PaymentHistoryEntry = {
  paymentId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  transactionId: string | null;
  soldByName: string | null;
  subscriptionId: string;
  subscriptionStatus: string;
  planName: string;
  startDate: Date;
  endDate: Date | null;
};

/** Every payment across every subscription a profile has ever had,
 * newest first — one timeline, even though renewals/extensions are
 * separate Subscription rows under the hood. */
export async function getPaymentHistory(profileId: string): Promise<PaymentHistoryEntry[]> {
  await auth();

  const subs = await prisma.subscription.findMany({
    where: { profileId },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      plan: { select: { name: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          paidAt: true,
          createdAt: true,
          transactionId: true,
          soldById: true,
        },
      },
    },
  });

  // Payment.soldById has no relation defined on the model, so resolve names
  // with a separate batched lookup rather than a nested select.
  const soldByIds = [
    ...new Set(subs.flatMap((s) => s.payments.map((p) => p.soldById).filter((id): id is string => !!id))),
  ];
  const sellers = soldByIds.length
    ? await prisma.user.findMany({ where: { id: { in: soldByIds } }, select: { id: true, name: true } })
    : [];
  const sellerNameById = new Map(sellers.map((u) => [u.id, u.name]));

  const entries: PaymentHistoryEntry[] = [];
  for (const s of subs) {
    for (const p of s.payments) {
      entries.push({
        paymentId: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        transactionId: p.transactionId,
        soldByName: p.soldById ? sellerNameById.get(p.soldById) ?? null : null,
        subscriptionId: s.id,
        subscriptionStatus: s.status,
        planName: s.plan.name,
        startDate: s.startDate,
        endDate: s.endDate,
      });
    }
  }

  return entries.sort((a, b) => (b.paidAt ?? b.createdAt).getTime() - (a.paidAt ?? a.createdAt).getTime());
}
