import crypto from "crypto";
import type { PaymentGateway, CreateOrderParams, CreateOrderResult, WebhookVerificationResult } from "../gateway";

const MOCK_SECRET = process.env.MOCK_PAYMENT_SECRET || "mock-dev-secret-change-me";

export const mockProvider: PaymentGateway = {
  name: "MOCK",

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const gatewayOrderId = `mock_order_${crypto.randomBytes(8).toString("hex")}`;
    // In a real gateway this URL would point to their hosted checkout.
    // Here it points to our own mock checkout page, which simulates pay/fail buttons.
    const checkoutUrl = `/pay/mock-checkout?orderId=${gatewayOrderId}&amount=${params.amount}&offerId=${params.offerId}`;
    return { gatewayOrderId, checkoutUrl };
  },

  async verifyWebhook(payload: any): Promise<WebhookVerificationResult> {
    // Real gateways verify an HMAC signature header against a secret.
    // Mock version checks a simple signed field we generate ourselves in the mock checkout.
    const expectedSig = crypto
      .createHmac("sha256", MOCK_SECRET)
      .update(`${payload.orderId}:${payload.amount}:${payload.status}`)
      .digest("hex");

    if (payload.signature !== expectedSig) {
      return { isValid: false, gatewayOrderId: null, gatewayTransactionId: null, status: "FAILED", amount: null };
    }

    return {
      isValid: true,
      gatewayOrderId: payload.orderId,
      gatewayTransactionId: `mock_txn_${crypto.randomBytes(6).toString("hex")}`,
      status: payload.status,
      amount: payload.amount,
    };
  },
};

export function signMockPayload(orderId: string, amount: number, status: "PAID" | "FAILED") {
  return crypto
    .createHmac("sha256", MOCK_SECRET)
    .update(`${orderId}:${amount}:${status}`)
    .digest("hex");
}
