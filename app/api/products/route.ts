import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { publicProduct } from "@/lib/serialize";

export async function GET() {
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    where: { active: true, variants: { some: { active: true } } },
    include: { variants: { where: { active: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products: products.map(publicProduct) });
}
