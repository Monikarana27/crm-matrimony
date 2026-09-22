import crypto from "crypto";
import type { PaymentGateway, CreateOrderParams, CreateOrderResult, WebhookVerificationResult } from "../gateway";
import { generatePayuRequestHash, verifyPayuResponseHash } from "./payu-hash";

const PAYU_KEY = process.env.PAYU_MERCHANT_KEY!;
const PAYU_SALT = process.env.PAYU_SALT!;
const PAYU_BASE_URL = "https://secure.payu.in/_payment"; // production

export const payuProvider: PaymentGateway = {
  name: "PAYU",

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const txnid = `txn_${crypto.randomBytes(8).toString("hex")}`;
    const amount = params.amount.toFixed(2);
    const productinfo = `Offer_${params.offerId}`;
    const firstname = params.customerName || "Customer";
    const email = params.customerEmail || "noemail@elitebandhan.com";

    const hash = generatePayuRequestHash({
      key: PAYU_KEY,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      salt: PAYU_SALT,
    });

    // PayU's hosted checkout is a form POST, not a simple redirect URL.
    // We encode everything needed into our own bridge page, which auto-submits
    // a real form to PayU with these exact fields.
    const formFields = new URLSearchParams({
      key: PAYU_KEY,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      surl: params.successRedirectUrl,
      furl: params.failureRedirectUrl,
      hash,
    });

    return {
      gatewayOrderId: txnid,
      checkoutUrl: `/pay/payu-redirect?${formFields.toString()}`,
    };
  },

  async verifyWebhook(payload: any): Promise<WebhookVerificationResult> {
    const isValid = verifyPayuResponseHash({
      key: payload.key,
      txnid: payload.txnid,
      amount: payload.amount,
      productinfo: payload.productinfo,
      firstname: payload.firstname,
      email: payload.email,
      status: payload.status,
      salt: PAYU_SALT,
      receivedHash: payload.hash,
      udf1: payload.udf1,
      udf2: payload.udf2,
      udf3: payload.udf3,
      udf4: payload.udf4,
      udf5: payload.udf5,
    });

    if (!isValid) {
      return { isValid: false, gatewayOrderId: null, gatewayTransactionId: null, status: "FAILED", amount: null };
    }

    return {
      isValid: true,
      gatewayOrderId: payload.txnid,
      gatewayTransactionId: payload.mihpayid || null,
      status: payload.status === "success" ? "PAID" : "FAILED",
      amount: parseFloat(payload.amount),
    };
  },
};

export const PAYU_ACTUAL_ENDPOINT = PAYU_BASE_URL;