import { test } from "node:test";
import assert from "node:assert/strict";
import { signSession, verifySession, checkAdminCredentials } from "../lib/admin-auth.ts";

const SECRET = "test-session-secret";

test("a freshly signed session verifies", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const token = signSession(SECRET, now);
  assert.equal(verifySession(token, SECRET, now), true);
});

test("a session verifies right up to the TTL boundary", () => {
  const issuedAt = Date.parse("2026-01-01T00:00:00Z");
  const token = signSession(SECRET, issuedAt);
  const twelveHoursLater = issuedAt + 12 * 60 * 60 * 1000;
  assert.equal(verifySession(token, SECRET, twelveHoursLater), true);
});

test("a session expires one millisecond past the TTL", () => {
  const issuedAt = Date.parse("2026-01-01T00:00:00Z");
  const token = signSession(SECRET, issuedAt);
  const justPast = issuedAt + 12 * 60 * 60 * 1000 + 1;
  assert.equal(verifySession(token, SECRET, justPast), false);
});

test("a session signed with a different secret does not verify", () => {
  const now = Date.now();
  const token = signSession("other-secret", now);
  assert.equal(verifySession(token, SECRET, now), false);
});

test("a tampered payload does not verify even with a valid-looking signature", () => {
  const now = Date.now();
  const token = signSession(SECRET, now);
  const [, sig] = token.split(".");
  const tampered = `${now + 1}.${sig}`;
  assert.equal(verifySession(tampered, SECRET, now), false);
});

test("garbage input never verifies", () => {
  assert.equal(verifySession(null, SECRET), false);
  assert.equal(verifySession(undefined, SECRET), false);
  assert.equal(verifySession("", SECRET), false);
  assert.equal(verifySession("not-a-valid-token", SECRET), false);
  assert.equal(verifySession("a.b.c", SECRET), false);
});

test("checkAdminCredentials matches only the exact expected pair", () => {
  const expected = { email: "admin@okhub.tech", password: "correct-horse-battery-staple" };
  assert.equal(checkAdminCredentials({ email: "admin@okhub.tech", password: "correct-horse-battery-staple" }, expected), true);
  assert.equal(checkAdminCredentials({ email: "admin@okhub.tech", password: "wrong" }, expected), false);
  assert.equal(checkAdminCredentials({ email: "wrong@okhub.tech", password: "correct-horse-battery-staple" }, expected), false);
});

test("checkAdminCredentials handles a shorter or longer guess without throwing", () => {
  const expected = { email: "admin@okhub.tech", password: "a-fairly-long-password" };
  assert.equal(checkAdminCredentials({ email: "admin@okhub.tech", password: "x" }, expected), false);
  assert.equal(
    checkAdminCredentials({ email: "admin@okhub.tech", password: "a-much-much-longer-guess-than-expected" }, expected),
    false,
  );
});
