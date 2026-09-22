export type CreateOrderParams = {
  offerId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string | null;
  successRedirectUrl: string;
  failureRedirectUrl: string;
};

export type CreateOrderResult = {
  gatewayOrderId: string;
  checkoutUrl: string;
};

export type WebhookVerificationResult = {
  isValid: boolean;
  gatewayOrderId: string | null;
  gatewayTransactionId: string | null;
  status: "PAID" | "FAILED" | "PENDING";
  amount: number | null;
};

export interface PaymentGateway {
  name: string;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  verifyWebhook(payload: any, headers: Record<string, string>): Promise<WebhookVerificationResult>;
}