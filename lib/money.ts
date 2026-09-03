/**
 * Paystack bills in the smallest currency unit (kobo for NGN), so that's what
 * every price is stored and moved around as internally. Naira only exists at
 * the edges: admin form input and on-screen formatting.
 */

export function nairaToKobo(naira: number): number {
  if (!Number.isFinite(naira) || naira < 0) {
    throw new Error(`invalid naira amount: ${naira}`);
  }
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

export function formatMoney(kobo: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(koboToNaira(kobo));
}
