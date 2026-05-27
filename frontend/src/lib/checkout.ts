/** Fixed platform fee applied to every transaction (cents). */
export const BASE_FEE_CENTS = 1_000;

/** Fixed delivery fee applied to every transaction (cents). */
export const DELIVERY_CENTS = 5_000;

/** Returns the grand total for a product purchase (cents). */
export function calcTotal(priceCents: number): number {
  return priceCents + BASE_FEE_CENTS + DELIVERY_CENTS;
}
