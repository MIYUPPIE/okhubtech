import { randomBytes } from "node:crypto";
import { z } from "zod";
import { DELIVERY_METHODS } from "./status.ts";

export const checkoutInputSchema = z.object({
  variantId: z.string().min(1),
  deliveryMethod: z.enum(DELIVERY_METHODS),
  email: z.string().email(),
  name: z.string().min(1).max(200).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export function generateOrderReference(): string {
  return `vs_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
}

/**
 * The only place an order's price is decided. It reads the variant's own
 * price out of the database row the server just fetched — never a number the
 * client sent — so a tampered checkout request cannot buy a video for ₦1.
 */
export function computeOrderAmountKobo(variant: { priceKobo: number; active: boolean }): number {
  if (!variant.active) throw new Error("this variant is no longer available");
  if (!Number.isInteger(variant.priceKobo) || variant.priceKobo <= 0) {
    throw new Error("variant has an invalid price");
  }
  return variant.priceKobo;
}
