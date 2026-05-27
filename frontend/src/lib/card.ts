// ─── string helpers ───────────────────────────────────────────────────────────

/** Strips all non-digit characters from a string. */
export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/** Formats raw input as a spaced 16-digit card number (e.g. "4111 1111 1111 1111"). */
export function formatCardNumber(s: string): string {
  return onlyDigits(s)
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

/** Returns a masked card string with only last 4 digits visible. */
export function maskCard(last4: string): string {
  return `**** **** **** ${last4}`;
}

// ─── brand detection ──────────────────────────────────────────────────────────

export type CardBrand = 'visa' | 'mastercard' | 'unknown';

/** Detects the card brand from the raw digit string. */
export function detectBrand(digits: string): CardBrand {
  if (!digits) return 'unknown';
  if (digits[0] === '4') return 'visa';
  const first2 = parseInt(digits.slice(0, 2), 10);
  if (first2 >= 51 && first2 <= 55) return 'mastercard';
  if (digits.length >= 4) {
    const first4 = parseInt(digits.slice(0, 4), 10);
    if (first4 >= 2221 && first4 <= 2720) return 'mastercard';
  }
  return 'unknown';
}

/** Human-readable brand name for display in summaries and receipts. */
export const BRAND_DISPLAY: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  unknown: 'Desconocida',
};

// ─── validation ───────────────────────────────────────────────────────────────

/** Validates a card number string using the Luhn algorithm. */
export function isValidLuhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Validates that an expiry string (MM/YY) is not in the past. */
export function isValidExpiry(s: string): boolean {
  const match = s.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  const now = new Date();
  return new Date(year, month - 1, 1) >= new Date(now.getFullYear(), now.getMonth(), 1);
}
