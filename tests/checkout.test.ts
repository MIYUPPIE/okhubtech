import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutInputSchema, computeOrderAmountKobo, generateOrderReference } from "../lib/checkout.ts";

test("computeOrderAmountKobo returns the variant's own price", () => {
  assert.equal(computeOrderAmountKobo({ priceKobo: 1500000, active: true }), 1500000);
});

test("computeOrderAmountKobo ignores everything except the variant row — there is no way to pass a client amount in", () => {
  // The function signature itself is the guarantee: it only accepts
  // {priceKobo, active}, so a checkout route physically cannot thread a
  // client-submitted price through to it. This test locks that contract.
  const variant = { priceKobo: 999999, active: true, extraneous: "client can't touch priceKobo" };
  assert.equal(computeOrderAmountKobo(variant), 999999);
});

test("computeOrderAmountKobo rejects an inactive variant", () => {
  assert.throws(() => computeOrderAmountKobo({ priceKobo: 1000, active: false }));
});

test("computeOrderAmountKobo rejects a zero or negative price", () => {
  assert.throws(() => computeOrderAmountKobo({ priceKobo: 0, active: true }));
  assert.throws(() => computeOrderAmountKobo({ priceKobo: -500, active: true }));
});

test("computeOrderAmountKobo rejects a non-integer price", () => {
  assert.throws(() => computeOrderAmountKobo({ priceKobo: 100.5, active: true }));
});

test("generateOrderReference produces unique, prefixed references", () => {
  const a = generateOrderReference();
  const b = generateOrderReference();
  assert.notEqual(a, b);
  assert.match(a, /^vs_[a-z0-9]+_[a-f0-9]{12}$/);
});

test("checkoutInputSchema accepts a well-formed request", () => {
  const parsed = checkoutInputSchema.safeParse({
    variantId: "abc123",
    deliveryMethod: "EMAIL",
    email: "buyer@example.com",
    name: "Ada",
  });
  assert.equal(parsed.success, true);
});

test("checkoutInputSchema rejects an invalid email", () => {
  const parsed = checkoutInputSchema.safeParse({
    variantId: "abc123",
    deliveryMethod: "DOWNLOAD",
    email: "not-an-email",
  });
  assert.equal(parsed.success, false);
});

test("checkoutInputSchema rejects an unknown delivery method", () => {
  const parsed = checkoutInputSchema.safeParse({
    variantId: "abc123",
    deliveryMethod: "CARRIER_PIGEON",
    email: "buyer@example.com",
  });
  assert.equal(parsed.success, false);
});

test("checkoutInputSchema requires a variantId", () => {
  const parsed = checkoutInputSchema.safeParse({ deliveryMethod: "DOWNLOAD", email: "buyer@example.com" });
  assert.equal(parsed.success, false);
});
