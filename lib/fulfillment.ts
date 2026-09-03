import type { Order } from "@prisma/client";
import { prisma } from "./prisma.ts";
import { deliveryEnv } from "./env.ts";
import { verifyTransaction } from "./paystack.ts";
import { generateDownloadToken, downloadUrlFor } from "./delivery.ts";
import { sendDeliveryEmail } from "./mailer.ts";
import type { OrderStatus } from "./status.ts";

async function createDeliveryGrant(orderId: string) {
  const e = deliveryEnv();
  const expiresAt = new Date(Date.now() + e.DOWNLOAD_TOKEN_TTL_HOURS * 60 * 60 * 1000);
  return prisma.deliveryGrant.create({
    data: { token: generateDownloadToken(), orderId, maxUses: e.DOWNLOAD_MAX_USES, expiresAt },
  });
}

export type FulfillmentResult =
  | { outcome: "paid" | "already_paid"; order: Order; downloadUrl: string | null }
  | { outcome: "not_successful"; order: Order; paystackStatus: string }
  | { outcome: "amount_mismatch"; order: Order }
  | { outcome: "unknown_reference" };

/**
 * The single path that turns a Paystack payment into a delivered video.
 * Called from two places — the webhook handler and the checkout success page
 * — because a webhook can be delayed and a browser redirect can be closed
 * before it lands; either one reaching here first must produce the same
 * result, and a second call must not re-charge, re-grant, or re-email.
 *
 * Always re-verifies against Paystack's API rather than trusting the caller's
 * claim that payment succeeded — a webhook payload can be replayed and a
 * browser redirect can be forged, but a secret-key API call to Paystack
 * cannot.
 */
export async function fulfillOrder(reference: string): Promise<FulfillmentResult> {
  const order = await prisma.order.findUnique({ where: { reference } });
  if (!order) return { outcome: "unknown_reference" };

  if (order.status === "PAID") {
    const grant = await prisma.deliveryGrant.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });
    return {
      outcome: "already_paid",
      order,
      downloadUrl: order.deliveryMethod === "DOWNLOAD" && grant ? downloadUrlFor(grant.token) : null,
    };
  }

  const verified = await verifyTransaction(reference);

  if (verified.status !== "success") {
    const status: OrderStatus = verified.status === "abandoned" ? "ABANDONED" : "FAILED";
    await prisma.order.update({ where: { id: order.id }, data: { status } });
    return { outcome: "not_successful", order, paystackStatus: verified.status };
  }

  // The amount and currency Paystack actually collected must match what we
  // asked for at checkout. This is the last line of defence against a
  // tampered or replayed reference paying for a cheaper variant than the one
  // being delivered.
  if (verified.amountKobo !== order.amountKobo || verified.currency !== order.currency) {
    const status: OrderStatus = "FAILED";
    await prisma.order.update({ where: { id: order.id }, data: { status } });
    return { outcome: "amount_mismatch", order };
  }

  const paidStatus: OrderStatus = "PAID";
  const paidOrder = await prisma.order.update({
    where: { id: order.id },
    data: { status: paidStatus, paidAt: verified.paidAt ? new Date(verified.paidAt) : new Date() },
  });

  const grant = await createDeliveryGrant(order.id);
  const downloadUrl = downloadUrlFor(grant.token);

  if (order.deliveryMethod === "EMAIL") {
    await sendDeliveryEmail({
      to: order.customerEmail,
      productTitle: order.productTitle,
      variantName: order.variantName,
      downloadUrl,
      expiresAt: grant.expiresAt,
    });
  }

  return {
    outcome: "paid",
    order: paidOrder,
    downloadUrl: order.deliveryMethod === "DOWNLOAD" ? downloadUrl : null,
  };
}
