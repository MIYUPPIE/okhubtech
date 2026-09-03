import { randomBytes } from "node:crypto";
import { coreEnv } from "./env.ts";

// Deliberately no Prisma import here: this module is pure logic (token
// generation, expiry/use-count rules, URL building) so it can be gate-tested
// without a database or a generated Prisma client. The one function that
// actually writes a grant, createDeliveryGrant, lives in lib/fulfillment.ts,
// which already owns the Prisma import.

export function generateDownloadToken(): string {
  return randomBytes(24).toString("base64url");
}

export type GrantLike = {
  expiresAt: Date;
  maxUses: number;
  useCount: number;
};

export type GrantCheck = { ok: true } | { ok: false; reason: "expired" | "exhausted" };

/** Pure so the expiry/use-count contract is gate-tested without a database. */
export function checkGrant(grant: GrantLike, now: Date = new Date()): GrantCheck {
  if (now.getTime() > grant.expiresAt.getTime()) return { ok: false, reason: "expired" };
  if (grant.useCount >= grant.maxUses) return { ok: false, reason: "exhausted" };
  return { ok: true };
}

export function downloadUrlFor(token: string): string {
  return `${coreEnv().APP_URL}/download/${token}`;
}
