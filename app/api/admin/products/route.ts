import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, digits and hyphens only"),
  title: z.string().min(1),
  description: z.string().min(1),
  thumbnailUrl: z.string().url(),
  active: z.boolean().optional(),
});

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const prisma = getPrisma();
  const existing = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return NextResponse.json({ error: "slug already in use" }, { status: 409 });

  const product = await prisma.product.create({ data: parsed.data });
  return NextResponse.json({ product }, { status: 201 });
}
