"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { subscriptionSchema } from "@/lib/validations/subscription.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function logActivity(actorId: string, action: string, entityId: string) {
  await prisma.activityLog.create({
    data: { actorId, action, entityType: "Subscription", entityId },
  });
}

export async function getSubscriptions(filter?: { status?: "ACTIVE" | "HOLD" | "EXPIRED" }) {
  const session = await requireStaff();
  const scopedFilter = !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ? { profile: { assignedToId: session.user.id } }
    : {};
  return prisma.subscription.findMany({
    where: { ...scopedFilter, isPaused: false, ...(filter?.status ? { status: filter.status } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { id: true, name: true, profileCode: true } },
      plan: { select: { id: true, name: true, price: true } },
    },
  });
}

export async function getSubscriptionById(id: string) {
  await requireStaff();
  return prisma.subscription.findUnique({
    where: { id },
    include: { profile: true, plan: true },
  });
}

export async function createSubscriptionAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireStaff();

  const parsed = subscriptionSchema.safeParse({
    profileId: formData.get("profileId"),
    planId: formData.get("planId"),
    status: formData.get("status") || "ACTIVE",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const plan = await prisma.plan.findUnique({ where: { id: parsed.data.planId } });
  if (!plan) {
    return { error: "Selected plan not found" };
  }

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : new Date();

  let endDate: Date;
  if (parsed.data.endDate) {
    endDate = new Date(parsed.data.endDate);
    if (endDate <= startDate) {
      return { error: "End date must be after the start date" };
    }
  } else {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);
  }

  // Double-submit guard: reject an identical create by the same staff member
  // within 2 minutes (a duplicate ACTIVE sub once split a client's shares).
  const recentDuplicate = await prisma.subscription.findFirst({
    where: {
      profileId: parsed.data.profileId,
      planId: parsed.data.planId,
      createdById: session.user.id,
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recentDuplicate) {
    return {
      error:
        "This subscription was just created. Check the Subscriptions page before creating another.",
    };
  }

  const subscription = await prisma.subscription.create({
    data: {
      profileId: parsed.data.profileId,
      planId: parsed.data.planId,
      status: parsed.data.status,
      startDate,
      endDate,
      createdById: session.user.id,
    },
  });

  await logActivity(await getActingUserId(session), "CREATE_SUBSCRIPTION", subscription.id);

  revalidatePath("/dashboard/admin/subscriptions");
  redirect("/dashboard/admin/subscriptions");
}

export async function updateSubscriptionStatusAction(
  subscriptionId: string,
  status: "ACTIVE" | "HOLD" | "EXPIRED"
) {
  const session = await requireStaff();

  if (status === "HOLD" && !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Only admins can set a subscription to Hold.");
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status },
  });

  await logActivity(await getActingUserId(session), `SUBSCRIPTION_STATUS_${status}`, subscriptionId);

  revalidatePath("/dashboard/admin/subscriptions");
}


export async function getOngoingServices() {
  const session = await requireStaff();
  const scopedFilter = !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ? { profile: { assignedToId: session.user.id } }
    : {};

  // A profile with a still-pending welcome call hasn't truly started service
  // yet, even though its subscription is already ACTIVE from the payment —
  // exclude those until the welcome call is marked complete.
  const pending = await prisma.welcomeCall.findMany({
    where: { profileId: { not: null }, status: "PENDING" },
    select: { profileId: true },
  });
  const excludeIds = pending.map((w) => w.profileId).filter((id): id is string => !!id);

  return prisma.subscription.findMany({
    where: {
      ...scopedFilter,
      status: { in: ["ACTIVE", "HOLD"] },
      isPaused: false,
      ...(excludeIds.length ? { profileId: { notIn: excludeIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { id: true, name: true, profileCode: true } },
      plan: { select: { id: true, name: true, price: true } },
    },
  });
}

export async function getExpiredClients() {
  const session = await requireStaff();
  const scopedFilter = !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ? { profile: { assignedToId: session.user.id } }
    : {};

  return prisma.subscription.findMany({
    where: { ...scopedFilter, status: "EXPIRED" },
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { id: true, name: true, profileCode: true } },
      plan: { select: { id: true, name: true, price: true } },
    },
  });
}

export async function deleteSubscriptionAction(subscriptionId: string) {
  const session = await requireStaff();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Only Admins can delete subscriptions");
  }

  await prisma.subscription.delete({ where: { id: subscriptionId } });

  await logActivity(await getActingUserId(session), "DELETE_SUBSCRIPTION", subscriptionId);

  revalidatePath("/dashboard/admin/subscriptions");
  revalidatePath("/dashboard/admin/ongoing-services");
  revalidatePath("/dashboard/admin/expired-clients");
}

export async function getPausedSubscriptions() {
  const session = await requireStaff();
  const scopedFilter = !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ? { profile: { assignedToId: session.user.id } }
    : {};

  return prisma.subscription.findMany({
    where: { ...scopedFilter, isPaused: true },
    orderBy: { pausedAt: "desc" },
    include: {
      profile: { select: { id: true, name: true, profileCode: true } },
      plan: { select: { id: true, name: true, price: true } },
    },
  });
}

export async function pauseSubscriptionAction(subscriptionId: string, days: number, reason: string) {
  const session = await requireStaff();
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Only admins can pause a subscription.");
  }
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("Pause days must be a positive whole number.");
  }
  if (!reason || !reason.trim()) {
    throw new Error("A reason is required to pause a subscription.");
  }

  const actingUserId = await getActingUserId(session);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      isPaused: true,
      pausedAt: new Date(),
      pauseDays: days,
      pausedById: actingUserId,
      pauseReason: reason.trim(),
    },
  });

  await logActivity(actingUserId, `PAUSE_SUBSCRIPTION_${days}_DAYS`, subscriptionId);

  revalidatePath("/dashboard/admin/subscriptions");
}

export async function resumeSubscriptionAction(subscriptionId: string) {
  const session = await requireStaff();

  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription) {
    throw new Error("Subscription not found.");
  }
  if (!subscription.isPaused || !subscription.pauseDays) {
    throw new Error("This subscription is not currently paused.");
  }

  const base = subscription.endDate ?? new Date();
  const newEndDate = new Date(base);
  newEndDate.setDate(newEndDate.getDate() + subscription.pauseDays);

  const actingUserId = await getActingUserId(session);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      isPaused: false,
      pausedAt: null,
      pauseDays: null,
      pausedById: null,
      pauseReason: null,
      totalPausedDays: { increment: subscription.pauseDays },
      endDate: newEndDate,
    },
  });

  await logActivity(actingUserId, "RESUME_SUBSCRIPTION", subscriptionId);

  revalidatePath("/dashboard/admin/subscriptions");
}
