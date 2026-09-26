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
}) {
  const session = await requireAdmin();

  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new Error("Plan not found");
  if (input.amount < 0) throw new Error("Amount cannot be negative");
  if (!input.soldById) throw new Error("Sold By is required");

  const result = await prisma.$transaction(async (tx) => {
    const { startDate, endDate, status } = await computeRenewalWindow(
      tx,
      input.profileId,
      plan.durationDays
    );

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
        notes: input.notes || null,
        paidAt,
        currency: input.currency ?? "INR",
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
