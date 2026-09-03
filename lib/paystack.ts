import { createHmac, timingSafeEqual } from "node:crypto";
import { paystackEnv } from "./env.ts";

const BASE_URL = "https://api.paystack.co";

export type InitializeTransactionParams = {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type InitializeTransactionResult = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

/**
 * Redirect-based checkout: we ask Paystack for a hosted payment page and send
 * the browser there. No Paystack.js in the frontend, no public key exposed —
 * only the secret key, used server-side, ever talks to Paystack's API.
 */
export async function initializeTransaction(
  params: InitializeTransactionParams,
): Promise<InitializeTransactionResult> {
  const res = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackEnv().PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.status) {
    throw new Error(`Paystack initialize failed: ${body?.message ?? res.statusText}`);
  }
  return {
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code,
    reference: body.data.reference,
  };
}

export type VerifyTransactionResult = {
  status: string;
  reference: string;
  amountKobo: number;
  currency: string;
  paidAt: string | null;
  customerEmail: string;
  transactionId: number;
};

/**
 * Always call this before trusting a "successful" payment — never trust the
 * browser redirect or the webhook payload alone. This hits Paystack's API
 * directly with our secret key, which a forged callback or webhook cannot do.
 */
export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const res = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackEnv().PAYSTACK_SECRET_KEY}` },
  });
  const body = await res.json();
  if (!res.ok || !body.status) {
    throw new Error(`Paystack verify failed: ${body?.message ?? res.statusText}`);
  }
  const d = body.data;
  return {
    status: d.status,
    reference: d.reference,
    amountKobo: d.amount,
    currency: d.currency,
    paidAt: d.paid_at,
    customerEmail: d.customer?.email ?? "",
    transactionId: d.id,
  };
}

/**
 * Paystack signs every webhook delivery with HMAC-SHA512 of the *raw* request
 * body, keyed with the secret key, sent as `x-paystack-signature`. Must run
 * on the untouched raw bytes — parsing to JSON first and re-serializing can
 * reorder keys and silently break the comparison. Pure and dependency-free so
 * it's covered by an offline gate test rather than only exercised by a real
 * webhook hitting production.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secretKey: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const gotBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== gotBuf.length) return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}
