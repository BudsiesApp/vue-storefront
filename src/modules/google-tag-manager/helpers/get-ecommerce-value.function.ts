export interface EcommerceItemValue {
  price: number,
  quantity?: number
}

export function getEcommerceValue (items: EcommerceItemValue[]): number {
  const amount = items.reduce(
    (total, item) => total + item.price * (item.quantity ?? 1),
    0
  );

  return Math.round(amount * 100) / 100;
}
