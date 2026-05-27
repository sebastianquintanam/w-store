import { describe, expect, it } from 'vitest';
import { BASE_FEE_CENTS, DELIVERY_CENTS, calcTotal } from './checkout';

describe('checkout constants', () => {
  it('BASE_FEE_CENTS is 1000', () => {
    expect(BASE_FEE_CENTS).toBe(1_000);
  });

  it('DELIVERY_CENTS is 5000', () => {
    expect(DELIVERY_CENTS).toBe(5_000);
  });
});

describe('calcTotal', () => {
  it('returns priceCents + BASE_FEE_CENTS + DELIVERY_CENTS', () => {
    expect(calcTotal(89_900)).toBe(95_900);
  });

  it('returns correct total for zero price', () => {
    expect(calcTotal(0)).toBe(6_000);
  });

  it('is additive: result equals manual sum', () => {
    const price = 200_000;
    expect(calcTotal(price)).toBe(price + BASE_FEE_CENTS + DELIVERY_CENTS);
  });
});
