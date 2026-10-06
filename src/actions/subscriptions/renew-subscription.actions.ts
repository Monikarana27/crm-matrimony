"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { computeRenewalWindow } from "@/lib/subscriptions/renewal";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getActivePlansForRenewal() {
  await requireAdmin();
  return prisma.plan.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
    select: { id: true, name: true, price: true, durationDays: true, currency: true },
  });
}

export async function getEmployeesForRenewal() {
  await requireAdmin();
  return prisma.user.findMany({
    where: {
      active: true,
      role: { in: ["SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] },
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function renewOrExtendSubscriptionAction(input: {
  profileId: string;
  planId: string;
  amount: number;
  method: "CASH" | "UPI" | "BANK_TRANSFER" | "CARD" | "PAYPAL" | "PAYU" | "OTHER";
  currency?: "INR" | "USD";
  soldById: string;
  transactionId?: string;
  notes?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, the last valid day
  bonusDays?: number; // free days on top of the plan
}) {
  const session = await requireAdmin();

  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new Error("Plan not found");
  if (input.amount < 0) throw new Error("Amount cannot be negative");
  if (!input.soldById) throw new Error("Sold By is required");

  const bonusDays = Math.max(0, Math.floor(Number(input.bonusDays ?? 0)) || 0);
  if (bonusDays > 365) throw new Error("Bonus days cannot be more than 365");
  const noteText =
    [input.notes, bonusDays > 0 ? `Includes ${bonusDays} free bonus days` : null]
      .filter(Boolean)
      .join(" | ") || null;

  const result = await prisma.$transaction(async (tx) => {
    let { startDate, endDate, status } = await computeRenewalWindow(
      tx,
      input.profileId,
      plan.durationDays + bonusDays
    );

    if (input.startDate || input.endDate) {
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      if (
        (input.startDate && !dateRe.test(input.startDate)) ||
        (input.endDate && !dateRe.test(input.endDate))
      ) {
        throw new Error("Invalid date");
      }
      const latest = await tx.subscription.findFirst({
        where: { profileId: input.profileId },
        orderBy: { createdAt: "desc" },
        select: { status: true, endDate: true },
      });
      const now = new Date();
      const stillActive = latest?.status === "ACTIVE" && !!latest.endDate && latest.endDate > now;

      // Same convention as scripts/expire-subscriptions.ts: dates are midnight IST
      // of the first / last valid day.
      if (input.startDate) startDate = new Date(`${input.startDate}T00:00:00+05:30`);
      if (input.endDate) {
        endDate = new Date(`${input.endDate}T00:00:00+05:30`);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.durationDays + bonusDays - 1);
      }
      if (endDate < startDate) throw new Error("End date cannot be before the start date");
      if (stillActive && startDate <= latest!.endDate!) {
        throw new Error(
          `The current service runs until ${latest!.endDate!.toISOString().slice(0, 10)}. Start the renewal after that date.`
        );
      }
      if (!stillActive && startDate > now) {
        throw new Error("Start date cannot be in the future when there is no running service.");
      }
      status = startDate > now ? "PENDING" : "ACTIVE";
    }

    const subscription = await tx.subscription.create({
      data: {
        profileId: input.profileId,
        planId: input.planId,
        status,
        startDate,
        endDate,
        createdById: session.user.id,
      },
    });

    const paidAt = new Date();
    const payment = await tx.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: input.amount,
        method: input.method,
        status: "PAID",
        transactionId: input.transactionId || null,
        notes: noteText,
        paidAt,
        currency: input.currency ?? (plan.currency === "USD" ? "USD" : "INR"),
        createdById: session.user.id,
        soldById: input.soldById,
      },
    });

    await tx.activityLog.create({
      data: {
        actorId: await getActingUserId(session),
        action: status === "PENDING" ? "SUBSCRIPTION_EXTENDED_STACKED" : "SUBSCRIPTION_RENEWED",
        entityType: "Subscription",
        entityId: subscription.id,
      },
    });

    return { subscription, payment };
  });

  revalidatePath("/dashboard/admin/subscriptions");
  revalidatePath("/dashboard/admin/ongoing-services");
  revalidatePath("/dashboard/admin/expired-clients");
  revalidatePath(`/dashboard/admin/profiles/${input.profileId}`);

  return {
    subscriptionId: result.subscription.id,
    status: result.subscription.status,
    startDate: result.subscription.startDate,
    endDate: result.subscription.endDate,
  };
}


/** Defaults for the Renew / Extend dialog. Dates are IST calendar dates (YYYY-MM-DD). */
export async function getRenewalDefaultsAction(profileId: string) {
  await requireAdmin();
  const IST_MS = 5.5 * 60 * 60 * 1000;
  const istDate = (d: Date) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);
  const now = new Date();

  const latest = await prisma.subscription.findFirst({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    select: { status: true, endDate: true },
  });
  const running =
    latest?.status === "ACTIVE" && latest.endDate && latest.endDate > now ? latest.endDate : null;

  const extendable = await prisma.subscription.findFirst({
    where: { profileId, status: { in: ["ACTIVE", "HOLD"] } },
    orderBy: { createdAt: "desc" },
    select: { endDate: true },
  });

  let suggestedStart = istDate(now);
  if (running) {
    const d = new Date(running.getTime() + IST_MS);
    d.setUTCDate(d.getUTCDate() + 1);
    suggestedStart = d.toISOString().slice(0, 10);
  }

  return {
    suggestedStart,
    runningEnd: running ? istDate(running) : null,
    extendEnd: extendable?.endDate ? istDate(extendable.endDate) : null,
  };
}

/** Adds free days to the running service. No plan, no payment. A queued renewal shifts by the same days. */
export async function extendSubscriptionDaysAction(input: { profileId: string; days: number }) {
  const session = await requireAdmin();
  const days = Math.floor(Number(input.days));
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    throw new Error("Enter between 1 and 365 days");
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.subscription.findFirst({
      where: { profileId: input.profileId, status: { in: ["ACTIVE", "HOLD"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, endDate: true },
    });
    if (!current || !current.endDate) {
      throw new Error("No running service to extend. If the service has expired, use Renew with the amount set to 0.");
    }

    const addDays = (d: Date) => {
      const n = new Date(d);
      n.setDate(n.getDate() + days);
      return n;
    };

    const newEnd = addDays(current.endDate);
    await tx.subscription.update({ where: { id: current.id }, data: { endDate: newEnd } });

    const queued = await tx.subscription.findMany({
      where: { profileId: input.profileId, status: "PENDING" },
      select: { id: true, startDate: true, endDate: true },
    });
    for (const q of queued) {
      await tx.subscription.update({
        where: { id: q.id },
        data: {
          startDate: addDays(q.startDate),
          ...(q.endDate ? { endDate: addDays(q.endDate) } : {}),
        },
      });
    }

    await tx.activityLog.create({
      data: {
        actorId: await getActingUserId(session),
        action: `SUBSCRIPTION_EXTENDED_${days}_DAYS`,
        entityType: "Subscription",
        entityId: current.id,
      },
    });

    return { subscriptionId: current.id, endDate: newEnd, shiftedQueued: queued.length };
  });

  revalidatePath("/dashboard/admin/subscriptions");
  revalidatePath("/dashboard/admin/ongoing-services");
  revalidatePath("/dashboard/admin/expired-clients");
  revalidatePath(`/dashboard/admin/profiles/${input.profileId}`);

  return result;
}
