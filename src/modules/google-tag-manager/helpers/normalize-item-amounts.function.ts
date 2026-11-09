const unitAmountFactor = 10000;

export function normalizeItemQuantity (qty: unknown, fallback: number): number {
  const quantity = typeof qty === 'string' && qty.trim() ? Number(qty) : qty;

  return typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0 ? quantity : fallback;
}

export function normalizeUnitAmount (amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount * unitAmountFactor) / unitAmountFactor;
}
