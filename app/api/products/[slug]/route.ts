import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { publicProduct } from "@/lib/serialize";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { variants: { where: { active: true } } },
  });
  if (!product || !product.active) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ product: publicProduct(product) });
}
