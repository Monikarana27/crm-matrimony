import { mockProvider } from "./providers/mock-provider";
import { payuProvider } from "./providers/payu-provider";
import { paypalProvider } from "./providers/paypal-provider";
import type { PaymentGateway } from "./gateway";

const PROVIDERS: Record<string, PaymentGateway> = {
  MOCK: mockProvider,
  PAYU: payuProvider,
  PAYPAL: paypalProvider,
  // RAZORPAY: razorpayProvider,
  // CASHFREE: cashfreeProvider,
  // STRIPE: stripeProvider,
};

// Defaults to MOCK in development so nobody accidentally hits a real gateway
// without explicitly setting ACTIVE_PAYMENT_GATEWAY. Production should always
// set this explicitly in its environment config, not rely on a default.
const ACTIVE_GATEWAY =
  process.env.ACTIVE_PAYMENT_GATEWAY ||
  (process.env.NODE_ENV === "production" ? "" : "MOCK");

export function getActiveGateway(): PaymentGateway {
  const provider = PROVIDERS[ACTIVE_GATEWAY];
  if (!provider) throw new Error(`Unknown payment gateway: ${ACTIVE_GATEWAY}`);
  return provider;
}

export function getGatewayByName(name: string): PaymentGateway {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown payment gateway: ${name}`);
  return provider;
}

export * from "./gateway";