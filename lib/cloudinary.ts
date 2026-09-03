import { v2 as cloudinary } from "cloudinary";
import { cloudinaryEnv } from "./env.ts";

let configured = false;
function configure() {
  if (configured) return;
  const e = cloudinaryEnv();
  cloudinary.config({
    cloud_name: e.CLOUDINARY_CLOUD_NAME,
    api_key: e.CLOUDINARY_API_KEY,
    api_secret: e.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

/**
 * A signed, time-limited download URL for an asset uploaded to Cloudinary
 * with delivery type "authenticated" (set at upload time, or changed on the
 * asset afterwards in the Cloudinary console — this service never uploads
 * video files itself, only links to ones already there; see the admin help
 * text on the product form). `sign_url` derives the signature from
 * CLOUDINARY_API_SECRET, so a guessed or reused URL past `expires_at` 403s.
 */
export function signedAssetUrl(publicId: string, resourceType: string, expiresInSeconds: number): string {
  configure();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
    flags: "attachment",
  });
}
