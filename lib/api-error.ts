/**
 * `Response.json()` types as `Promise<unknown>`, which cannot be
 * property-accessed at all without narrowing first — every client component
 * here was doing `body?.error` on an unnarrowed `unknown` (previously
 * compiled fine, since older lib.dom.d.ts typed `.json()` as `Promise<any>`;
 * a newer TypeScript target correctly stopped allowing it). One helper for
 * the same "does this JSON error body have a string `error` field" check
 * every admin/checkout form repeats, instead of an inline type guard at each
 * call site.
 */
export function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return fallback;
}
