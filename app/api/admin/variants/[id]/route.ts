import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { nairaToKobo } from "@/lib/money";

const updateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priceNaira: z.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  cloudinaryPublicId: z.string().min(1).nullable().optional(),
  cloudinaryResourceType: z.string().optional(),
  externalAssetUrl: z.string().url().nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const prisma = getPrisma();

  const current = await prisma.variant.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = updateVariantSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { priceNaira, ...rest } = parsed.data;

  const nextCloudinary = rest.cloudinaryPublicId !== undefined ? rest.cloudinaryPublicId : current.cloudinaryPublicId;
  const nextExternal = rest.externalAssetUrl !== undefined ? rest.externalAssetUrl : current.externalAssetUrl;
  if (Boolean(nextCloudinary) === Boolean(nextExternal)) {
    return NextResponse.json(
      { error: "exactly one of cloudinaryPublicId or externalAssetUrl must be set" },
      { status: 400 },
    );
  }

  const variant = await prisma.variant.update({
    where: { id },
    data: { ...rest, ...(priceNaira !== undefined ? { priceKobo: nairaToKobo(priceNaira) } : {}) },
  });
  return NextResponse.json({ variant });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  const prisma = getPrisma();
  const orderCount = await prisma.order.count({ where: { variantId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: `${orderCount} order(s) reference this variant; deactivate it instead of deleting` },
      { status: 409 },
    );
  }
  const deleted = await prisma.variant.delete({ where: { id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
