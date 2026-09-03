import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paystackEnv } from "@/lib/env";
import { verifyWebhookSignature } from "@/lib/paystack";
import { fulfillOrder } from "@/lib/fulfillment";

/**
 * Paystack's source of truth for "did this actually get paid". The checkout
 * success page (app/checkout/success/page.tsx) also calls fulfillOrder as a
 * fallback for a buyer who closes the tab before Paystack's redirect lands,
 * but this webhook is what fulfils an order even if the buyer never comes
 * back at all.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature, paystackEnv().PAYSTACK_SECRET_KEY)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; data?: { id?: number; reference?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const eventType = payload.event;
  const transactionId = payload.data?.id;
  const reference = payload.data?.reference;

  if (!eventType || typeof transactionId !== "number" || !reference) {
    // Not a shape we recognise — acknowledge so Paystack doesn't retry forever.
    return NextResponse.json({ ok: true });
  }

  // (eventType, transactionId) is unique, but a row existing is not the same
  // as the event having actually been handled: if a previous delivery's
  // fulfillOrder call threw (a transient network blip, Paystack briefly
  // down), that row exists with processedAt still null, and the retry Paystack
  // sends must actually retry — not get waved through as "already handled"
  // and silently drop a real payment.
  let webhookEvent = await prisma.webhookEvent.findUnique({
    where: { eventType_transactionId: { eventType, transactionId } },
  });

  if (webhookEvent?.processedAt) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (!webhookEvent) {
    try {
      webhookEvent = await prisma.webhookEvent.create({
        data: { eventType, transactionId, reference, rawPayload: rawBody },
      });
    } catch (err) {
      // Lost a race with a concurrent delivery of the same event — someone
      // else's request just inserted it. Pick up whatever they left.
      if (!isUniqueConstraintError(err)) throw err;
      webhookEvent = await prisma.webhookEvent.findUniqueOrThrow({
        where: { eventType_transactionId: { eventType, transactionId } },
      });
      if (webhookEvent.processedAt) return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  if (eventType === "charge.success") {
    const result = await fulfillOrder(reference);
    const orderId = result.outcome === "unknown_reference" ? null : result.order.id;
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date(), orderId },
    });
  } else {
    await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date() } });
  }

  return NextResponse.json({ ok: true });
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}
