const unitAmountFactor = 10000;

export function roundUnitAmount (amount: number): number {
  return Math.round(amount * unitAmountFactor) / unitAmountFactor;
}
