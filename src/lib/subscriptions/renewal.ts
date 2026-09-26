import { prisma } from "@/lib/db/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Computes the start/end/status for a new subscription that extends or
 * renews a profile's service, per the "stacking" rule:
 * - If the profile's latest subscription is still ACTIVE with a future
 *   endDate, the new one starts the day after that endDate and is
 *   scheduled as PENDING (not ACTIVE yet) — the old one keeps running
 *   uninterrupted until its own natural end. The expire-subscriptions
 *   cron flips PENDING -> ACTIVE the same day it flips the old one
 *   ACTIVE -> EXPIRED, so there's never a gap or a day with two ACTIVE
 *   rows.
 * - Otherwise (expired or no subscription yet), the new one starts today
 *   and is ACTIVE immediately.
 */
export async function computeRenewalWindow(
  tx: Tx,
  profileId: string,
  planDurationDays: number
): Promise<{ startDate: Date; endDate: Date; status: "ACTIVE" | "PENDING" }> {
  const latest = await tx.subscription.findFirst({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    select: { status: true, endDate: true },
  });

  const now = new Date();
  const stillActive = latest?.status === "ACTIVE" && latest.endDate && latest.endDate > now;

  const startDate = stillActive ? new Date(latest!.endDate!) : now;
  if (stillActive) {
    startDate.setDate(startDate.getDate() + 1);
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + planDurationDays);

  return { startDate, endDate, status: stillActive ? "PENDING" : "ACTIVE" };
}
