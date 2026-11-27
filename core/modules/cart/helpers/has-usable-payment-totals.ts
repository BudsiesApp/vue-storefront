export const hasUsablePaymentTotals = (totals: any): boolean => {
  if (!totals) return false
  const { base_grand_total, base_tax_amount, base_shipping_amount, base_subtotal, base_discount_amount, quote_currency_code } = totals
  return [base_grand_total, base_tax_amount, base_shipping_amount, base_subtotal, base_discount_amount].every(Number.isFinite) &&
    typeof quote_currency_code === 'string' && quote_currency_code.length > 0
}
