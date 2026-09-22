"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { can } from "@/lib/permissions/can";
import { paymentSchema } from "@/lib/validations/payment.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unassignProfileForServiceOnPayment } from "@/lib/assignment/auto-assign";
import { upsertAchievementForPayment, removeAchievementForPayment } from "@/lib/achievements/sync-achievement";

async function requirePayments(minAction: "VIEW" | "CREATE" | "EDIT" | "FULL") {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const allowed = await can(session.user.role, "Payments", minAction);
  if (!allowed) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function logActivity(actorId: string, action: string, entityId: string) {
  await prisma.activityLog.create({
    data: { actorId, action, entityType: "Payment", entityId },
  });
}

export async function getPayments(filter?: { status?: "PAID" | "PENDING" | "FAILED" }) {
  await requirePayments("VIEW");
  return prisma.payment.findMany({
    where: filter?.status ? { status: filter.status } : {},
    orderBy: { createdAt: "desc" },
    include: {
      subscription: {
        include: {
          profile: { select: { id: true, name: true, profileCode: true } },
          plan: { select: { id: true, name: true } },
        },
      },
        paymentOffer: { select: { token: true } },
    },
  });
}

export async function getPaymentById(id: string) {
  await requirePayments("VIEW");
  return prisma.payment.findUnique({
    where: { id },
    include: { subscription: { include: { profile: true, plan: true } } },
  });
}

export async function createPaymentAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await requirePayments("CREATE");

  const parsed = paymentSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    soldById: formData.get("soldById"),
    amount: formData.get("amount"),
    method: formData.get("method") || "OTHER",
    status: formData.get("status") || "PENDING",
    transactionId: formData.get("transactionId"),
    paymentLinkUrl: formData.get("paymentLinkUrl"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const paidAt = parsed.data.status === "PAID" ? new Date() : null;

  const payment = await prisma.payment.create({
    data: {
      subscriptionId: parsed.data.subscriptionId,
      soldById: parsed.data.soldById,
      amount: parsed.data.amount,
      method: parsed.data.method,
      status: parsed.data.status,
      transactionId: parsed.data.transactionId || null,
      paymentLinkUrl: parsed.data.paymentLinkUrl || null,
      notes: parsed.data.notes || null,
      paidAt,
      createdById: session.user.id,
    },
  });

  await logActivity(await getActingUserId(session), "CREATE_PAYMENT", payment.id);

  if (parsed.data.status === "PAID" && paidAt) {
    await upsertAchievementForPayment(prisma, {
      paymentId: payment.id,
      soldById: parsed.data.soldById,
      amount: parsed.data.amount,
      paidAt,
    });
    const sub = await prisma.subscription.findUnique({
      where: { id: parsed.data.subscriptionId },
      select: { profileId: true },
    });
    if (sub) {
      await unassignProfileForServiceOnPayment(sub.profileId, session.user.id);
    }
  }

  revalidatePath("/dashboard/admin/payments");
  redirect("/dashboard/admin/payments");
}

export async function updatePaymentStatusAction(
  paymentId: string,
  status: "PAID" | "PENDING" | "FAILED"
) {
  const session = await requirePayments("EDIT");

  const paidAt = status === "PAID" ? new Date() : null;

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { status, paidAt },
    select: { soldById: true, amount: true, subscription: { select: { profileId: true } } },
  });

  await logActivity(await getActingUserId(session), `PAYMENT_STATUS_${status}`, paymentId);

  if (status === "PAID" && paidAt && updated.soldById) {
    await upsertAchievementForPayment(prisma, {
      paymentId,
      soldById: updated.soldById,
      amount: updated.amount,
      paidAt,
    });
    if (updated.subscription) {
      await unassignProfileForServiceOnPayment(updated.subscription.profileId, session.user.id);
    }
  } else if (status !== "PAID") {
    await removeAchievementForPayment(prisma, paymentId);
  }

  revalidatePath("/dashboard/admin/payments");
}
export async function deletePaymentAction(paymentId: string) {
  const session = await requirePayments("FULL");

  await removeAchievementForPayment(prisma, paymentId);
  await prisma.payment.delete({ where: { id: paymentId } });

  await logActivity(await getActingUserId(session), "DELETE_PAYMENT", paymentId);

  revalidatePath("/dashboard/admin/payments");
}
