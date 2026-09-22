import type { PaymentGateway, CreateOrderParams, CreateOrderResult, WebhookVerificationResult } from "../gateway";
import { paypalRequest, PAYPAL_BASE_URL } from "./paypal-client";

export const paypalProvider: PaymentGateway = {
  name: "PAYPAL",

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const order = await paypalRequest("POST", "/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: params.offerId,
          amount: {
            currency_code: params.currency,
            value: params.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: params.successRedirectUrl,
        cancel_url: params.failureRedirectUrl,
        user_action: "PAY_NOW",
      },
    });

    const approveLink = order.links?.find((l: any) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!approveLink) throw new Error("PayPal did not return an approval link");

    return { gatewayOrderId: order.id, checkoutUrl: approveLink };
  },

  // PayPal's primary confirmation for our flow happens via the authenticated
  // capture call (see /pay/paypal-return route), not this webhook verifier.
  // This is kept for interface compatibility and as an async reliability backup.
  async verifyWebhook(payload: any): Promise<WebhookVerificationResult> {
    const eventType = payload.event_type;
    const isCapture = eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "PAYMENT.CAPTURE.DENIED";

    if (!isCapture) {
      return { isValid: false, gatewayOrderId: null, gatewayTransactionId: null, status: "PENDING", amount: null };
    }

    const resource = payload.resource;
    const orderId = resource?.supplementary_data?.related_ids?.order_id || null;

    return {
      isValid: true,
      gatewayOrderId: orderId,
      gatewayTransactionId: resource?.id || null,
      status: eventType === "PAYMENT.CAPTURE.COMPLETED" ? "PAID" : "FAILED",
      amount: resource?.amount?.value ? parseFloat(resource.amount.value) : null,
    };
  },
};