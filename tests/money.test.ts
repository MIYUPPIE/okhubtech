import { test } from "node:test";
import assert from "node:assert/strict";
import { nairaToKobo, koboToNaira, formatMoney } from "../lib/money.ts";

test("nairaToKobo converts and rounds to the nearest kobo", () => {
  assert.equal(nairaToKobo(15000), 1500000);
  assert.equal(nairaToKobo(19.999), 2000);
  assert.equal(nairaToKobo(0), 0);
});

test("nairaToKobo rejects negative or non-finite amounts", () => {
  assert.throws(() => nairaToKobo(-1));
  assert.throws(() => nairaToKobo(NaN));
  assert.throws(() => nairaToKobo(Infinity));
});

test("koboToNaira is the inverse of nairaToKobo for whole kobo amounts", () => {
  assert.equal(koboToNaira(1500000), 15000);
  assert.equal(koboToNaira(50), 0.5);
});

test("formatMoney renders a naira currency string", () => {
  const formatted = formatMoney(1500000, "NGN");
  assert.match(formatted, /15,000/);
});
