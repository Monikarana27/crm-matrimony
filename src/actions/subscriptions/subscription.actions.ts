"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { subscriptionSchema } from "@/lib/validations/subscription.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startOfTodayIST } from "@/lib/utils/date-boundaries";

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
      plan: { select: { id: true, name: true, price: true, currency: true } },
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
      // Safety net: never list a plan whose last valid day has passed, even
      // if the expire-subscriptions cron hasn't flipped its status yet.
      OR: [{ endDate: null }, { endDate: { gte: startOfTodayIST() } }],
      ...(excludeIds.length ? { profileId: { notIn: excludeIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { id: true, name: true, profileCode: true } },
      plan: { select: { id: true, name: true, price: true, currency: true } },
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
      plan: { select: { id: true, name: true, price: true, currency: true } },
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

export async function editSubscriptionAction(
  subscriptionId: string,
  data: { planId: string; startDate: string; endDate: string }
) {
  const session = await requireStaff();
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Only admins can edit a subscription.");
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(data.startDate) || !datePattern.test(data.endDate)) {
    throw new Error("Please enter valid start and end dates.");
  }

  // Dates are entered as IST calendar days: start = 00:00 IST, end = 23:59:59 IST
  const startDate = new Date(`${data.startDate}T00:00:00+05:30`);
  const endDate = new Date(`${data.endDate}T23:59:59+05:30`);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Please enter valid start and end dates.");
  }
  if (endDate <= startDate) {
    throw new Error("End date must be after the start date.");
  }

  const existing = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: { select: { name: true } } },
  });
  if (!existing) {
    throw new Error("Subscription not found.");
  }

  const plan = await prisma.plan.findUnique({
    where: { id: data.planId },
    select: { id: true, name: true },
  });
  if (!plan) {
    throw new Error("Selected plan not found.");
  }

  const actingUserId = await getActingUserId(session);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { planId: plan.id, startDate, endDate },
  });

  const istDay = (d: Date | null) =>
    d ? new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10) : "none";
  await logActivity(
    actingUserId,
    `EDIT_SUBSCRIPTION plan ${existing.plan.name} -> ${plan.name}; start ${istDay(existing.startDate)} -> ${data.startDate}; end ${istDay(existing.endDate)} -> ${data.endDate}`,
    subscriptionId
  );

  revalidatePath("/dashboard/admin/subscriptions");
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
      plan: { select: { id: true, name: true, price: true, currency: true } },
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
