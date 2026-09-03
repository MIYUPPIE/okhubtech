import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "../lib/paystack.ts";

const SECRET = "sk_test_super_secret";

function sign(body: string, secret = SECRET): string {
  return createHmac("sha512", secret).update(body, "utf8").digest("hex");
}

test("accepts a correctly signed body", () => {
  const body = JSON.stringify({ event: "charge.success", data: { id: 1, reference: "vs_1" } });
  assert.equal(verifyWebhookSignature(body, sign(body), SECRET), true);
});

test("rejects a body signed with the wrong secret", () => {
  const body = JSON.stringify({ event: "charge.success", data: { id: 1 } });
  assert.equal(verifyWebhookSignature(body, sign(body, "wrong-secret"), SECRET), false);
});

test("rejects a tampered body (signature computed over the original)", () => {
  const original = JSON.stringify({ event: "charge.success", data: { id: 1, reference: "vs_1" } });
  const signature = sign(original);
  const tampered = JSON.stringify({ event: "charge.success", data: { id: 1, reference: "vs_2" } });
  assert.equal(verifyWebhookSignature(tampered, signature, SECRET), false);
});

test("rejects a missing signature header", () => {
  const body = JSON.stringify({ event: "charge.success" });
  assert.equal(verifyWebhookSignature(body, null, SECRET), false);
});

test("rejects a signature of the wrong length rather than throwing", () => {
  const body = JSON.stringify({ event: "charge.success" });
  assert.equal(verifyWebhookSignature(body, "short", SECRET), false);
});

test("rejects an empty string signature", () => {
  const body = JSON.stringify({ event: "charge.success" });
  assert.equal(verifyWebhookSignature(body, "", SECRET), false);
});
