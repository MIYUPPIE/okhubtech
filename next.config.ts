import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Deploys as a Cloudflare Worker via @opennextjs/cloudflare — see
// wrangler.jsonc and open-next.config.ts. It needs a live server for
// checkout, the Paystack webhook, and gated downloads, so do not add
// `output: 'export'` here, unlike okhubtech.com's static export.
//
// No `output: "standalone"`: this service previously also supported a
// Docker/VPS deploy (removed once lib/prisma.ts became Cloudflare D1-only —
// getCloudflareContext() has nothing to return outside a Worker runtime, so
// that path stopped working regardless of this setting). If a non-Workers
// deploy is ever wanted again, both lib/prisma.ts and this need revisiting
// together, not just this line — see git history for the last working
// Docker setup (Dockerfile, docker-compose*.yml, Caddyfile).
const nextConfig: NextConfig = {
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

// Lets `npm run dev` (plain `next dev`, not `wrangler dev`) reach the D1
// binding and other Cloudflare bindings declared in wrangler.jsonc, via
// local emulation — otherwise getCloudflareContext() in lib/prisma.ts has
// nothing to return outside of an actual Worker/wrangler-dev runtime.
//
// No top-level await, even via a bare `await import(...)`: Next's own
// config loader (next-config-ts/transpile-config.js) requires the compiled
// next.config.ts synchronously via CJS require(), which cannot load an ESM
// graph containing top-level await at all — `opennextjs-cloudflare build`
// failed outright with ERR_REQUIRE_ASYNC_MODULE the first time this used
// one. Everything async lives inside this unawaited IIFE instead. Dev-only
// guard: importing @opennextjs/cloudflare's dev-only API path in a
// production build is exactly what this exists to prevent.
if (process.env.NODE_ENV === "development") {
  void (async () => {
    const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
    await initOpenNextCloudflareForDev();
  })();
}

export default nextConfig;
