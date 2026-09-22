import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { paypalRequest } from "@/lib/payments/providers/paypal-client";
import { completeOfferPayment } from "@/lib/payments/complete-offer";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("token"); // PayPal calls it "token" in the return URL

  if (!orderId) {
    return NextResponse.redirect(new URL("/pay/invalid", req.url));
  }

  const offer = await prisma.paymentOffer.findFirst({
    where: { paymentOrderId: orderId },
  });

  if (!offer) {
    return NextResponse.redirect(new URL("/pay/invalid", req.url));
  }

  if (offer.status === "PAID") {
    return NextResponse.redirect(new URL(`/pay/${offer.token}/success`, req.url));
  }

  try {
    const capture = await paypalRequest("POST", `/v2/checkout/orders/${orderId}/capture`);

    const captureStatus = capture.status;
    const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
    const capturedAmount = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;

    if (captureStatus !== "COMPLETED") {
      return NextResponse.redirect(new URL(`/pay/${offer.token}/failed`, req.url));
    }

    // Never trust anything but the server-verified capture amount from PayPal itself.
    if (capturedAmount && Math.abs(parseFloat(capturedAmount) - offer.finalAmount) > 0.01) {
      await prisma.activityLog.create({
        data: { actorId: offer.createdById, action: "PAYMENT_AMOUNT_MISMATCH", entityType: "PaymentOffer", entityId: offer.id },
      });
      return NextResponse.redirect(new URL(`/pay/${offer.token}/failed`, req.url));
    }

    await completeOfferPayment({ offerId: offer.id, gatewayTransactionId: captureId });

    return NextResponse.redirect(new URL(`/pay/${offer.token}/success`, req.url));
  } catch (err) {
    console.error("PayPal capture error:", err);
    return NextResponse.redirect(new URL(`/pay/${offer.token}/failed`, req.url));
  }
}