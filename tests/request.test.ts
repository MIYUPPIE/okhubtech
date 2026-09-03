import { test } from "node:test";
import assert from "node:assert/strict";
import { isHttpsRequest } from "../lib/request.ts";

function fakeRequest(url: string, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers));
  return { url, headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null } };
}

test("a plain HTTP request with no proxy in front is not https", () => {
  // This is the exact case that broke: `docker compose up` hit directly
  // over http://localhost:4100, no reverse proxy — NODE_ENV=production was
  // the old (wrong) signal here and would have said true.
  assert.equal(isHttpsRequest(fakeRequest("http://localhost:4100/api/admin/login")), false);
});

test("a request whose own URL is https is https", () => {
  assert.equal(isHttpsRequest(fakeRequest("https://store.okhubtech.com/api/admin/login")), true);
});

test("x-forwarded-proto: https from a TLS-terminating proxy wins even though the internal URL is http", () => {
  assert.equal(
    isHttpsRequest(fakeRequest("http://127.0.0.1:4100/api/admin/login", { "x-forwarded-proto": "https" })),
    true,
  );
});

test("x-forwarded-proto: http is respected too, not just its presence", () => {
  assert.equal(
    isHttpsRequest(fakeRequest("http://127.0.0.1:4100/api/admin/login", { "x-forwarded-proto": "http" })),
    false,
  );
});

test("a comma-separated x-forwarded-proto (multiple proxies) uses the first hop", () => {
  assert.equal(
    isHttpsRequest(fakeRequest("http://127.0.0.1:4100/api/admin/login", { "x-forwarded-proto": "https, http" })),
    true,
  );
});
