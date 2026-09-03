import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { coreEnv } from "@/lib/env";
import { checkoutInputSchema, computeOrderAmountKobo, generateOrderReference } from "@/lib/checkout";
import { initializeTransaction } from "@/lib/paystack";
import type { OrderStatus } from "@/lib/status";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = checkoutInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const variant = await prisma.variant.findUnique({
    where: { id: input.variantId },
    include: { product: true },
  });
  if (!variant || !variant.product.active) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }

  let amountKobo: number;
  try {
    amountKobo = computeOrderAmountKobo(variant);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "invalid variant" }, { status: 400 });
  }

  const reference = generateOrderReference();
  const pendingStatus: OrderStatus = "PENDING";

  const order = await prisma.order.create({
    data: {
      reference,
      status: pendingStatus,
      variantId: variant.id,
      productTitle: variant.product.title,
      variantName: variant.name,
      amountKobo,
      currency: variant.currency,
      customerEmail: input.email,
      customerName: input.name,
      deliveryMethod: input.deliveryMethod,
    },
  });

  try {
    const tx = await initializeTransaction({
      email: input.email,
      amountKobo,
      reference,
      callbackUrl: `${coreEnv().APP_URL}/checkout/success`,
      metadata: { orderId: order.id, productSlug: variant.product.slug, variantId: variant.id },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paystackAuthorizationUrl: tx.authorizationUrl, paystackAccessCode: tx.accessCode },
    });

    return NextResponse.json({ authorizationUrl: tx.authorizationUrl, reference });
  } catch (err) {
    const failedStatus: OrderStatus = "FAILED";
    await prisma.order.update({ where: { id: order.id }, data: { status: failedStatus } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "could not start payment" },
      { status: 502 },
    );
  }
}
