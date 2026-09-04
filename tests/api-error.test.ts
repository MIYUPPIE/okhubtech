import { test } from "node:test";
import assert from "node:assert/strict";
import { extractErrorMessage } from "../lib/api-error.ts";

test("extracts a string error field", () => {
  assert.equal(extractErrorMessage({ error: "invalid credentials" }, "fallback"), "invalid credentials");
});

test("falls back when there is no error field", () => {
  assert.equal(extractErrorMessage({ ok: true }, "fallback"), "fallback");
});

test("falls back when error is not a string (e.g. zod's flattened error object)", () => {
  assert.equal(extractErrorMessage({ error: { fieldErrors: {} } }, "fallback"), "fallback");
});

test("falls back on null, undefined, and non-object bodies", () => {
  assert.equal(extractErrorMessage(null, "fallback"), "fallback");
  assert.equal(extractErrorMessage(undefined, "fallback"), "fallback");
  assert.equal(extractErrorMessage("plain string body", "fallback"), "fallback");
  assert.equal(extractErrorMessage(42, "fallback"), "fallback");
});
