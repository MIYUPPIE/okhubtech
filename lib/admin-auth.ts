import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "vs_admin";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

/** Signed, stateless session token: `<issuedAtMs>.<hmac>`. No session table. */
export function signSession(secret: string, issuedAtMs: number = Date.now()): string {
  const payload = `${issuedAtMs}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined | null, secret: string, now: number = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts as [string, string];
  const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  const gotBuf = Buffer.from(sig, "utf8");
  if (expectedBuf.length !== gotBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, gotBuf)) return false;
  const issuedAtMs = Number(payload);
  if (!Number.isFinite(issuedAtMs)) return false;
  const age = now - issuedAtMs;
  return age >= 0 && age <= SESSION_TTL_MS;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    // Compare against itself so a length mismatch still costs constant time,
    // rather than a length-dependent one that leaks how close a guess was.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Pure and dependency-free on purpose: the caller reads env() and passes the
 * expected credentials in, so this contract (constant-time comparison, both
 * fields checked, length differences don't leak) is gate-testable with no
 * environment configured at all.
 */
export function checkAdminCredentials(
  input: { email: string; password: string },
  expected: { email: string; password: string },
): boolean {
  return timingSafeEqualStr(input.email, expected.email) && timingSafeEqualStr(input.password, expected.password);
}
