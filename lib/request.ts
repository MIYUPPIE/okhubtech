/**
 * Whether a request arrived over HTTPS — used to decide the `Secure` flag on
 * the admin session cookie (app/api/admin/login/route.ts). Checking
 * `NODE_ENV === "production"` instead of this was the actual bug: the
 * Docker image runs with NODE_ENV=production in every deploy, including a
 * bare `docker compose up` hit directly over plain HTTP with no reverse
 * proxy yet — a Secure cookie set over HTTP is silently dropped by the
 * browser, so login returns 200 with no visible error and /admin just
 * bounces back to the login page.
 *
 * x-forwarded-proto is what the TLS-terminating proxy (Nginx/Caddy/Traefik)
 * this service's README assumes in front of a real deployment sets; the
 * request's own URL scheme is the fallback for local/direct HTTP access.
 */
export function isHttpsRequest(req: { headers: { get(name: string): string | null }; url: string }): boolean {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto.split(",")[0]?.trim() === "https";
  return new URL(req.url).protocol === "https:";
}
