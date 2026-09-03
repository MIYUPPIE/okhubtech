import type { Product, Variant } from "@prisma/client";

/**
 * What a buyer is allowed to see. Deliberately excludes cloudinaryPublicId
 * and externalAssetUrl — the whole point of the delivery-grant system is
 * that the raw asset location is never handed to a browser before payment
 * clears.
 */
export function publicVariant(v: Variant) {
  return {
    id: v.id,
    name: v.name,
    description: v.description,
    priceKobo: v.priceKobo,
    currency: v.currency,
  };
}

export function publicProduct(p: Product & { variants: Variant[] }) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    thumbnailUrl: p.thumbnailUrl,
    variants: p.variants.filter((v) => v.active).map(publicVariant),
  };
}
