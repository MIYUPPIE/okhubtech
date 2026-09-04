import { PrismaClient } from "../generated/prisma-client/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * A Worker has no persistent process to hold a module-level singleton
 * client on (a given request can land on any isolate, and isolates come and
 * go), and the D1 binding itself only exists inside a request's Cloudflare
 * context — so this constructs a client per call rather than once at import
 * time, the way lib/prisma.ts worked in the Docker/VPS deploy this replaced.
 * getCloudflareContext() is what @opennextjs/cloudflare exposes to reach
 * that binding from a Next.js route handler or Server Component; env.DB is
 * the D1 binding name declared in wrangler.jsonc.
 */
export function getPrisma(): PrismaClient {
  const { env } = getCloudflareContext();
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}
