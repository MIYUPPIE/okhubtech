import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { nairaToKobo } from "@/lib/money";

const createVariantSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    priceNaira: z.number().positive(),
    currency: z.string().min(3).max(3).optional(),
    cloudinaryPublicId: z.string().min(1).optional(),
    cloudinaryResourceType: z.string().optional(),
    externalAssetUrl: z.string().url().optional(),
    active: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.cloudinaryPublicId) !== Boolean(d.externalAssetUrl), {
    message: "set exactly one of cloudinaryPublicId or externalAssetUrl",
  });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id: productId } = await params;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = createVariantSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const variant = await prisma.variant.create({
    data: {
      productId,
      name: d.name,
      description: d.description,
      priceKobo: nairaToKobo(d.priceNaira),
      currency: d.currency ?? "NGN",
      cloudinaryPublicId: d.cloudinaryPublicId,
      cloudinaryResourceType: d.cloudinaryResourceType ?? "video",
      externalAssetUrl: d.externalAssetUrl,
      active: d.active ?? true,
    },
  });
  return NextResponse.json({ variant }, { status: 201 });
}
