import { test } from "node:test";
import assert from "node:assert/strict";
import { checkGrant, generateDownloadToken } from "../lib/delivery.ts";

test("a grant within its expiry and use count is ok", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const grant = { expiresAt: new Date("2026-01-02T00:00:00Z"), maxUses: 5, useCount: 0 };
  assert.deepEqual(checkGrant(grant, now), { ok: true });
});

test("a grant is expired once now passes expiresAt", () => {
  const now = new Date("2026-01-03T00:00:00Z");
  const grant = { expiresAt: new Date("2026-01-02T00:00:00Z"), maxUses: 5, useCount: 0 };
  assert.deepEqual(checkGrant(grant, now), { ok: false, reason: "expired" });
});

test("a grant is exhausted once useCount reaches maxUses", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const grant = { expiresAt: new Date("2026-01-02T00:00:00Z"), maxUses: 5, useCount: 5 };
  assert.deepEqual(checkGrant(grant, now), { ok: false, reason: "exhausted" });
});

test("expiry is checked before use count — a grant that is both reports expired", () => {
  const now = new Date("2026-01-03T00:00:00Z");
  const grant = { expiresAt: new Date("2026-01-02T00:00:00Z"), maxUses: 5, useCount: 5 };
  assert.deepEqual(checkGrant(grant, now), { ok: false, reason: "expired" });
});

test("the exact expiry instant itself is still valid (not yet past it)", () => {
  const expiresAt = new Date("2026-01-02T00:00:00Z");
  const grant = { expiresAt, maxUses: 5, useCount: 0 };
  assert.deepEqual(checkGrant(grant, expiresAt), { ok: true });
});

test("generateDownloadToken produces distinct, url-safe tokens", () => {
  const a = generateDownloadToken();
  const b = generateDownloadToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.ok(a.length >= 24);
});
