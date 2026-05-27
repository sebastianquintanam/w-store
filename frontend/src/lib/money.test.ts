import { describe, expect, it } from 'vitest';
import { formatCOP } from './money';

describe('formatCOP', () => {
  it('formats a typical price without decimals', () => {
    const result = formatCOP(89_900);
    // Must contain the numeric digits — tolerates locale-specific separators and symbol variants
    expect(result).toMatch(/89/);
    expect(result).toMatch(/900/);
    // es-CO uses ',' as decimal separator; maximumFractionDigits:0 means no fractional part
    expect(result).not.toMatch(/,\d/);
  });

  it('formats zero without decimals', () => {
    const result = formatCOP(0);
    expect(result).toMatch(/0/);
    expect(result).not.toMatch(/\.\d/); // no decimal digits
  });

  it('returns a non-empty string', () => {
    expect(formatCOP(150_000).length).toBeGreaterThan(0);
  });
});
