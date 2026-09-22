"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { generatePaymentToken } from "@/lib/payments/token";
import { getActiveGateway, getGatewayByName } from "@/lib/payments";
import { revalidatePath } from "next/cache";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function createPaymentOfferAction(params: {
  profileId: string;
  planId: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  expiresAt: string; // ISO date string from a datetime-local input
  currency?: "INR" | "USD";
}) {
  const session = await requireStaff();

  const plan = await prisma.plan.findUnique({ where: { id: params.planId } });
  if (!plan) return { error: "Plan not found" };

  if (params.discountValue < 0) return { error: "Discount cannot be negative" };

  let finalAmount: number;
  if (params.discountType === "PERCENTAGE") {
    if (params.discountValue > 100) return { error: "Percentage discount cannot exceed 100%" };
    finalAmount = plan.price - (plan.price * params.discountValue) / 100;
  } else {
    if (params.discountValue > plan.price) return { error: "Discount cannot exceed the original price" };
    finalAmount = plan.price - params.discountValue;
  }
  finalAmount = Math.round(finalAmount * 100) / 100;

  if (finalAmount < 0) return { error: "Final amount cannot be negative" };

  const expiresAt = new Date(params.expiresAt);
  if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return { error: "Expiry must be a valid future date" };
  }

  let token = generatePaymentToken();
  // Extremely unlikely collision given the random space, but guard anyway.
  let attempts = 0;
  while (await prisma.paymentOffer.findUnique({ where: { token } })) {
    token = generatePaymentToken();
    attempts++;
    if (attempts > 5) return { error: "Could not generate a unique token, try again" };
  }

  const offer = await prisma.paymentOffer.create({
    data: {
      token,
      profileId: params.profileId,
      createdById: session.user.id,
      planId: params.planId,
      originalAmount: plan.price,
      discountType: params.discountType,
      discountValue: params.discountValue,
      finalAmount,
      status: "ACTIVE",
      expiresAt,
      currency: params.currency ?? "INR",
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: await getActingUserId(session),
      action: "OFFER_CREATED",
      entityType: "PaymentOffer",
      entityId: offer.id,
    },
  });

  revalidatePath("/dashboard/admin/payment-offers");
  return { error: null, token: offer.token, offerId: offer.id };
}

export async function getPaymentOfferByToken(token: string) {
  const offer = await prisma.paymentOffer.findUnique({
    where: { token },
    include: {
      plan: { select: { name: true } },
      profile: { select: { name: true } },
    },
  });
  return offer;
}

export async function cancelPaymentOfferAction(offerId: string) {
  const session = await requireStaff();

  const offer = await prisma.paymentOffer.findUnique({ where: { id: offerId } });
  if (!offer) return { error: "Offer not found" };
  if (offer.status === "PAID") return { error: "Cannot cancel a paid offer" };

  await prisma.paymentOffer.update({
    where: { id: offerId },
    data: { status: "CANCELLED" },
  });

  await prisma.activityLog.create({
    data: { actorId: await getActingUserId(session), action: "OFFER_CANCELLED", entityType: "PaymentOffer", entityId: offerId },
  });

  revalidatePath("/dashboard/admin/payment-offers");
  return { error: null };
}

export async function getPaymentOffers() {
  await requireStaff();
  return prisma.paymentOffer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { id: true, name: true } },
      plan: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function getDiscountEligibleClients() {
  const session = await requireStaff();
  const role = session.user.role;
  const isScopedRole = ["SALES", "SERVICE"].includes(role);

  return prisma.profile.findMany({
    where: {
      ...(isScopedRole ? { assignedToId: session.user.id } : {}),
      subscriptions: { some: { status: "ACTIVE" } },
    },
    orderBy: { name: "asc" },
    include: {
      assignedTo: { select: { id: true, name: true } },
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: { select: { id: true, name: true, price: true } } },
      },
      paymentOffers: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, finalAmount: true, createdAt: true },
      },
    },
  });
}


export async function initiateCheckoutAction(token: string) {
  const offer = await prisma.paymentOffer.findUnique({
    where: { token },
    include: { profile: { select: { name: true, email: true } } },
  });

  if (!offer) return { error: "Offer not found" };
  if (offer.status === "PAID") return { error: "This offer has already been paid" };
  if (offer.status === "CANCELLED") return { error: "This offer is no longer available" };
  if (offer.expiresAt < new Date()) return { error: "This offer has expired" };

  // PayU only supports INR. PayPal handles USD. Route accordingly regardless
  // of the globally configured default gateway.
  const gateway = offer.currency === "USD" ? getGatewayByName("PAYPAL") : getActiveGateway();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const isPaypal = gateway.name === "PAYPAL";

  const order = await gateway.createOrder({
    offerId: offer.id,
    amount: offer.finalAmount,
    currency: offer.currency,
    customerName: offer.profile.name,
    customerEmail: offer.profile.email,
    successRedirectUrl: isPaypal ? `${origin}/pay/paypal-return` : `${origin}/api/webhooks/payu`,
    failureRedirectUrl: isPaypal ? `${origin}/pay/paypal-return` : `${origin}/api/webhooks/payu`,
  });

  await prisma.paymentOffer.update({
    where: { id: offer.id },
    data: {
      status: "CHECKOUT_STARTED",
      checkoutStartedAt: new Date(),
      paymentGateway: gateway.name,
      paymentOrderId: order.gatewayOrderId,
    },
  });

  return { error: null, checkoutUrl: order.checkoutUrl };
}

export async function trackOfferOpenedAction(token: string) {
  const offer = await prisma.paymentOffer.findUnique({ where: { token }, select: { id: true, firstOpenedAt: true, status: true } });
  if (!offer) return;

  await prisma.paymentOffer.update({
    where: { id: offer.id },
    data: {
      openCount: { increment: 1 },
      firstOpenedAt: offer.firstOpenedAt ?? new Date(),
      lastOpenedAt: new Date(),
      status: offer.status === "ACTIVE" ? "OPENED" : offer.status,
    },
  });
}