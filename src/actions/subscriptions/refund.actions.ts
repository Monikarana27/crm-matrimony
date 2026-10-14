"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { revalidatePath } from "next/cache";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function requireAdmin() {
  const session = await requireStaff();
  if (!ADMIN_ROLES.includes(session.user.role)) throw new Error("Unauthorized");
  return session;
}

function revalidateAll() {
  revalidatePath("/dashboard/admin/subscriptions");
  revalidatePath("/dashboard/admin/ongoing-services");
  revalidatePath("/dashboard/admin/expired-clients");
  revalidatePath("/dashboard/admin/refunds");
  revalidatePath("/dashboard/service");
}

/** Admin-only. Reason is required. */
export async function markForRefundAction(
  subscriptionId: string,
  reason: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAdmin();

  const cleanReason = (reason ?? "").trim();
  if (cleanReason.length < 5) {
    return { error: "Please enter the reason for the refund (at least 5 characters)." };
  }

  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, status: true, profile: { select: { assignedToId: true } } },
  });
  if (!sub) return { error: "Subscription not found." };

  if (sub.status !== "ACTIVE" && sub.status !== "HOLD") {
    return { error: "Only active or on-hold services can be marked for refund." };
  }

  const actorId = await getActingUserId(session);
  await prisma.$transaction([
    prisma.refund.create({
      data: { subscriptionId, reason: cleanReason, requestedById: actorId },
    }),
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "REFUNDED" },
    }),
    prisma.activityLog.create({
      data: { actorId, action: "SUBSCRIPTION_MARKED_FOR_REFUND", entityType: "Subscription", entityId: subscriptionId },
    }),
  ]);

  revalidateAll();
  return { success: true };
}

/** Admin-only list for the Refund Clients table. */
export async function getRefundClients() {
  await requireAdmin();

  const refunds = await prisma.refund.findMany({
    orderBy: { requestedAt: "desc" },
    include: {
      subscription: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          profile: { select: { id: true, name: true, profileCode: true, assignedTo: { select: { name: true } } } },
          plan: { select: { name: true, price: true, currency: true } },
          payments: { where: { status: "PAID" }, select: { amount: true, amountInr: true, currency: true } },
        },
      },
    },
  });

  const userIds = Array.from(
    new Set(refunds.flatMap((r) => [r.requestedById, r.processedById]).filter((x): x is string => !!x))
  );
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return refunds.map((r) => ({
    ...r,
    requestedByName: r.requestedById ? nameById.get(r.requestedById) ?? "Unknown" : "Unknown",
    processedByName: r.processedById ? nameById.get(r.processedById) ?? "Unknown" : null,
  }));
}

/** Admin confirms the money has been returned. */
export async function processRefundAction(
  refundId: string,
  input: { amount?: number | null; note?: string }
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAdmin();

  const refund = await prisma.refund.findUnique({ where: { id: refundId }, select: { id: true, status: true, subscriptionId: true } });
  if (!refund) return { error: "Refund not found." };
  if (refund.status !== "PENDING") return { error: "This refund is already processed." };

  const amount = input.amount != null && Number.isFinite(input.amount) && input.amount >= 0 ? input.amount : null;
  const actorId = await getActingUserId(session);

  await prisma.$transaction([
    prisma.refund.update({
      where: { id: refundId },
      data: {
        status: "PROCESSED",
        amount,
        processNote: (input.note ?? "").trim() || null,
        processedById: actorId,
        processedAt: new Date(),
      },
    }),
    prisma.activityLog.create({
      data: { actorId, action: "REFUND_PROCESSED", entityType: "Subscription", entityId: refund.subscriptionId },
    }),
  ]);

  revalidateAll();
  return { success: true };
}

/** Refund history for one client (all their subscriptions). Admin-only; others get an empty list. */
export async function getRefundHistoryAction(profileId: string) {
  const session = await requireStaff();
  if (!ADMIN_ROLES.includes(session.user.role)) return [];

  const refunds = await prisma.refund.findMany({
    where: { subscription: { profileId } },
    orderBy: { requestedAt: "desc" },
    include: { subscription: { select: { plan: { select: { name: true } } } } },
  });

  const userIds = Array.from(
    new Set(refunds.flatMap((r) => [r.requestedById, r.processedById]).filter((x): x is string => !!x))
  );
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return refunds.map((r) => ({
    id: r.id,
    planName: r.subscription.plan.name,
    reason: r.reason,
    status: r.status,
    amount: r.amount,
    processNote: r.processNote,
    requestedAt: r.requestedAt,
    processedAt: r.processedAt,
    requestedByName: r.requestedById ? nameById.get(r.requestedById) ?? "Unknown" : "Unknown",
    processedByName: r.processedById ? nameById.get(r.processedById) ?? null : null,
  }));
}
