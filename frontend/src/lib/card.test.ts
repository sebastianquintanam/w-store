import { describe, expect, it } from 'vitest';
import {
  onlyDigits,
  formatCardNumber,
  detectBrand,
  isValidLuhn,
  isValidExpiry,
  maskCard,
  BRAND_DISPLAY,
} from './card';

// ─── onlyDigits ───────────────────────────────────────────────────────────────

describe('onlyDigits', () => {
  it('strips letters', () => {
    expect(onlyDigits('abc123')).toBe('123');
  });

  it('strips spaces', () => {
    expect(onlyDigits('4111 1111 1111 1111')).toBe('4111111111111111');
  });

  it('returns empty string for all non-digits', () => {
    expect(onlyDigits('hello!')).toBe('');
  });

  it('returns digits unchanged', () => {
    expect(onlyDigits('1234')).toBe('1234');
  });
});

// ─── formatCardNumber ─────────────────────────────────────────────────────────

describe('formatCardNumber', () => {
  it('groups 16 digits into blocks of 4', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
  });

  it('truncates input beyond 16 digits', () => {
    const result = formatCardNumber('41111111111111119999');
    expect(result).toBe('4111 1111 1111 1111');
  });

  it('strips spaces before grouping', () => {
    expect(formatCardNumber('4111 1111 1111 1111')).toBe('4111 1111 1111 1111');
  });

  it('handles partial input without trailing space', () => {
    const result = formatCardNumber('4111');
    expect(result).toBe('4111');
  });
});

// ─── detectBrand ─────────────────────────────────────────────────────────────

describe('detectBrand', () => {
  it('detects visa by leading 4', () => {
    expect(detectBrand('4111111111111111')).toBe('visa');
  });

  it('detects mastercard for IIN range 51-55', () => {
    expect(detectBrand('5100000000000000')).toBe('mastercard');
    expect(detectBrand('5500000000000000')).toBe('mastercard');
  });

  it('detects mastercard for IIN range 2221-2720', () => {
    expect(detectBrand('2221000000000000')).toBe('mastercard');
    expect(detectBrand('2720000000000000')).toBe('mastercard');
  });

  it('returns unknown for unrecognized prefix', () => {
    expect(detectBrand('6011000000000000')).toBe('unknown');
  });

  it('returns unknown for empty string', () => {
    expect(detectBrand('')).toBe('unknown');
  });
});

// ─── isValidLuhn ─────────────────────────────────────────────────────────────

describe('isValidLuhn', () => {
  it('accepts a valid card number (4111111111111111)', () => {
    expect(isValidLuhn('4111111111111111')).toBe(true);
  });

  it('accepts another valid Mastercard test number', () => {
    expect(isValidLuhn('5500005555555559')).toBe(true);
  });

  it('rejects a number with wrong check digit', () => {
    expect(isValidLuhn('4111111111111112')).toBe(false);
  });

  it('rejects a sequence with wrong check digit (1234567890123456)', () => {
    // Luhn sum = 64, 64 % 10 !== 0 → invalid
    expect(isValidLuhn('1234567890123456')).toBe(false);
  });
});

// ─── isValidExpiry ────────────────────────────────────────────────────────────

describe('isValidExpiry', () => {
  it('accepts a far-future date (12/99)', () => {
    expect(isValidExpiry('12/99')).toBe(true);
  });

  it('rejects a past date (01/20)', () => {
    expect(isValidExpiry('01/20')).toBe(false);
  });

  it('rejects invalid month (13/30)', () => {
    expect(isValidExpiry('13/30')).toBe(false);
  });

  it('rejects wrong format (1299 without slash)', () => {
    expect(isValidExpiry('1299')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidExpiry('')).toBe(false);
  });
});

// ─── maskCard ─────────────────────────────────────────────────────────────────

describe('maskCard', () => {
  it('masks card with last 4 digits', () => {
    expect(maskCard('1111')).toBe('**** **** **** 1111');
  });

  it('uses the provided last4 verbatim', () => {
    expect(maskCard('9999')).toBe('**** **** **** 9999');
  });
});

// ─── BRAND_DISPLAY ────────────────────────────────────────────────────────────

describe('BRAND_DISPLAY', () => {
  it('maps visa to "Visa"', () => {
    expect(BRAND_DISPLAY.visa).toBe('Visa');
  });

  it('maps mastercard to "Mastercard"', () => {
    expect(BRAND_DISPLAY.mastercard).toBe('Mastercard');
  });

  it('maps unknown to "Desconocida"', () => {
    expect(BRAND_DISPLAY.unknown).toBe('Desconocida');
  });
});
