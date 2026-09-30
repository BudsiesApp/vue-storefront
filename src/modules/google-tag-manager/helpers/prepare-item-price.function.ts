import type { PriceHelper } from 'src/modules/shared';

interface ProductPriceInput {
  price?: number,
  price_incl_tax?: number,
  qty?: number
}

function finiteAmount (value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function taxExclusivePrice (product: ProductPriceInput, unitPrice: number): number {
  const netPrice = finiteAmount(product.price);
  const grossPrice = finiteAmount(product.price_incl_tax);

  if (netPrice !== undefined && grossPrice && grossPrice > 0) {
    return unitPrice * netPrice / grossPrice;
  }

  return unitPrice;
}

export function prepareProductPrice (product: ProductPriceInput, selectedPrice: PriceHelper.ProductPrice) {
  const quantity = finiteAmount(product.qty) || 1;
  const regular = taxExclusivePrice(product, selectedPrice.regular / quantity);
  const paidLinePrice = selectedPrice.special !== null && selectedPrice.special < selectedPrice.regular
    ? selectedPrice.special
    : selectedPrice.regular;
  const paid = taxExclusivePrice(product, paidLinePrice / quantity);

  return {
    price: Math.max(0, finiteAmount(paid) ?? 0),
    discount: Math.max(0, finiteAmount(regular - paid) ?? 0)
  };
}
