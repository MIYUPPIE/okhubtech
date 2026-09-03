export type AssetSource =
  | { kind: "cloudinary"; publicId: string; resourceType: string }
  | { kind: "external"; url: string };

export type VariantAssetFields = {
  cloudinaryPublicId: string | null;
  cloudinaryResourceType: string;
  externalAssetUrl: string | null;
};

/**
 * A variant's deliverable resolves one of two ways: an asset uploaded to
 * Cloudinary (signed, expiring URL generated at delivery time — see
 * lib/cloudinary.ts) or a plain externally-hosted link (a Google Drive /
 * Dropbox share). Exactly one must be set; the schema can't enforce that XOR
 * itself (SQLite has no portable CHECK-constraint story via Prisma), so this
 * is the one place both admin writes and delivery reads must agree on it.
 */
export function resolveAssetSource(variant: VariantAssetFields): AssetSource {
  const hasCloudinary = Boolean(variant.cloudinaryPublicId);
  const hasExternal = Boolean(variant.externalAssetUrl);
  if (hasCloudinary === hasExternal) {
    throw new Error(
      "variant must have exactly one of cloudinaryPublicId or externalAssetUrl set, not zero or both",
    );
  }
  if (hasCloudinary) {
    return {
      kind: "cloudinary",
      publicId: variant.cloudinaryPublicId as string,
      resourceType: variant.cloudinaryResourceType || "video",
    };
  }
  return { kind: "external", url: variant.externalAssetUrl as string };
}
