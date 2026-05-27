/**
 * Formats a cent-based integer as Colombian Peso currency string.
 * Example: 150000 → "$ 150.000"
 */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
