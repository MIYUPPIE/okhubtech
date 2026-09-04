import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const prisma = getPrisma();

  const url = new URL(req.url);
  const take = Math.min(Number(url.searchParams.get("take") ?? 50) || 50, 200);
  const cursor = url.searchParams.get("cursor");

  const orders = await prisma.order.findMany({
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: { variant: { include: { product: true } } },
  });

  const paidAgg = await prisma.order.aggregate({
    where: { status: "PAID" },
    _sum: { amountKobo: true },
    _count: true,
  });

  return NextResponse.json({
    orders,
    nextCursor: orders.length === take ? (orders[orders.length - 1]?.id ?? null) : null,
    summary: { paidCount: paidAgg._count, paidAmountKobo: paidAgg._sum.amountKobo ?? 0 },
  });
}
