import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import ProductManager from "./product-manager";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { orderBy: { createdAt: "asc" } } },
  });
  if (!product) notFound();

  return (
    <main className="shell">
      <ProductManager
        product={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          description: product.description,
          thumbnailUrl: product.thumbnailUrl,
          active: product.active,
        }}
        variants={product.variants.map((v) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          priceNaira: v.priceKobo / 100,
          currency: v.currency,
          cloudinaryPublicId: v.cloudinaryPublicId,
          cloudinaryResourceType: v.cloudinaryResourceType,
          externalAssetUrl: v.externalAssetUrl,
          active: v.active,
        }))}
      />
    </main>
  );
}
