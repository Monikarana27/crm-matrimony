import { prisma } from "@/lib/db/prisma";
import { upsertAchievementForPayment } from "@/lib/achievements/sync-achievement";
import { computeRenewalWindow } from "@/lib/subscriptions/renewal";

export async function completeOfferPayment(params: {
  offerId: string;
  gatewayTransactionId: string | null;
}) {
  const offer = await prisma.paymentOffer.findUnique({
    where: { id: params.offerId },
    include: { profile: true, plan: true },
  });

  if (!offer) return { success: false, reason: "Offer not found" };
  if (offer.status === "PAID") return { success: true, alreadyPaid: true };

  await prisma.$transaction(async (tx) => {
    // Always create a fresh subscription for this payment, using the same
    // stacking rule as manual renewals: if the client already has a running
    // ACTIVE subscription, this new one is scheduled to start the day after
    // it ends (status PENDING) rather than silently attaching this payment
    // to the existing row and leaving the expiry date untouched.
    const { startDate, endDate, status } = await computeRenewalWindow(
      tx,
      offer.profileId,
      offer.plan.durationDays
    );

    const subscription = await tx.subscription.create({
      data: {
        profileId: offer.profileId,
        planId: offer.planId,
        status,
        startDate,
        endDate,
        createdById: offer.createdById,
      },
    });

    const paidAt = new Date();
    const payment = await tx.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: offer.finalAmount,
        method: offer.currency === "USD" ? "PAYPAL" : "PAYU",
        status: "PAID",
        transactionId: params.gatewayTransactionId,
        paidAt,
        currency: offer.currency,
        createdById: offer.createdById,
        soldById: offer.createdById,
      },
    });

    await upsertAchievementForPayment(tx, {
      paymentId: payment.id,
      soldById: offer.createdById,
      amount: offer.finalAmount,
      paidAt,
    });

    await tx.paymentOffer.update({
      where: { id: offer.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentTransactionId: params.gatewayTransactionId,
        paymentId: payment.id,
      },
    });

    await tx.activityLog.create({
      data: { actorId: offer.createdById, action: "PAYMENT_SUCCESS", entityType: "PaymentOffer", entityId: offer.id },
    });

    await tx.notification.create({
      data: {
        recipientId: offer.createdById,
        type: "IMPORTANT_ANNOUNCEMENT",
        content: `Payment Received: ${offer.profile.name} paid ${offer.currency === "USD" ? "$" : "₹"}${offer.finalAmount.toLocaleString()} for ${offer.plan.name} Membership.`,
        entityType: "PROFILE",
        entityId: offer.profileId,
      },
    });
  });

  return { success: true, alreadyPaid: false, token: offer.token };
}