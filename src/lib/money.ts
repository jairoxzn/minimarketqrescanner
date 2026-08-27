/** Currency/IGV helpers. Amounts are always plain numbers (converted from Prisma Decimal at the boundary). */

export function formatMoney(amount: number, symbol = "S/") {
  return `${symbol} ${amount.toFixed(2)}`;
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Cuando igvIncluded=true, el precio de venta ya incluye el IGV — el monto de
 * IGV se calcula "hacia atrás" a partir del total, no se suma encima.
 */
export function calcIgvFromTotal(total: number, igvPercent: number, igvIncluded: boolean) {
  if (!igvIncluded) return 0;
  return round2(total - total / (1 + igvPercent / 100));
}
