import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getActiveGateway } from "@/lib/payments";
import { completeOfferPayment } from "@/lib/payments/complete-offer";

export async function POST(req: NextRequest) {
  let payload: Record<string, string> = {};

  try {
    const formData = await req.formData();
    formData.forEach((value, key) => {
      payload[key] = value.toString();
    });
  } catch (err) {
    console.error("Failed to parse PayU webhook body:", err);
    return NextResponse.redirect(new URL("/pay/invalid", process.env.APP_URL));
  }

  console.log("PayU webhook raw payload:", payload);

  const gateway = getActiveGateway();
  const result = await gateway.verifyWebhook(payload, {});

  console.log("PayU webhook payload:", payload);
  console.log("PayU verify result:", result);

  if (!result.isValid || !result.gatewayOrderId) {
    return NextResponse.redirect(new URL("/pay/invalid", process.env.APP_URL));
  }

  const offer = await prisma.paymentOffer.findFirst({
    where: { paymentOrderId: result.gatewayOrderId },
    include: { profile: true, plan: true },
  });

  console.log("Looked up offer by gatewayOrderId:", result.gatewayOrderId, "found:", !!offer);

  if (!offer) {
    return NextResponse.redirect(new URL("/pay/invalid", process.env.APP_URL));
  }

  // Idempotency: if this offer is already PAID, don't process again —
  // gateways can and do deliver the same webhook more than once.
  if (offer.status === "PAID") {
    return NextResponse.redirect(new URL(`/pay/${offer.token}/success`, process.env.APP_URL));
  }

  if (result.status === "FAILED") {
    await prisma.paymentOffer.update({
      where: { id: offer.id },
      data: { status: "FAILED" },
    });
    return NextResponse.redirect(new URL(`/pay/${offer.token}/failed`, process.env.APP_URL));
  }

  // Amount verification — never trust the browser, only what we stored server-side.
  if (result.amount !== null && Math.abs(result.amount - offer.finalAmount) > 0.01) {
    await prisma.activityLog.create({
      data: {
        actorId: offer.createdById,
        action: "PAYMENT_AMOUNT_MISMATCH",
        entityType: "PaymentOffer",
        entityId: offer.id,
      },
    });
    return NextResponse.redirect(new URL(`/pay/${offer.token}/failed`, process.env.APP_URL));
  }

  await completeOfferPayment({ offerId: offer.id, gatewayTransactionId: result.gatewayTransactionId });

  return NextResponse.redirect(new URL(`/pay/${offer.token}/success`, process.env.APP_URL));
}