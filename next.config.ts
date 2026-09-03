import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// This service runs as a real Node process (Docker on a VPS / Render / Railway),
// unlike okhubtech.com's static export — it needs a live server for checkout,
// Paystack webhooks, and gated video delivery. Do not add `output: 'export'` here.
const nextConfig: NextConfig = {
  // A self-contained server bundle (own node_modules subset, no host install
  // step) — see Dockerfile, which copies exactly this output.
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // This service has its own lockfile but lives nested inside the okhubtech
  // repo, which has one too — pin the root explicitly so Turbopack doesn't
  // guess (and doesn't guess wrong on someone else's machine).
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
