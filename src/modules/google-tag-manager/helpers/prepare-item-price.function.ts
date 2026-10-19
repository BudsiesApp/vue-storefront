import type Product from '@vue-storefront/core/modules/catalog/types/Product';
import type { ProductDiscountedPrice } from '@vue-storefront/core/modules/catalog';
import { getProductDiscountedPrice } from '@vue-storefront/core/helpers/product-discounted-price';
import { calculateProductDefaultBundleOptionsPrice, getProductPriceData } from '@vue-storefront/core/helpers/price';

function finiteAmount (value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function netRatio (net: unknown, gross: unknown): number | undefined {
  const netAmount = finiteAmount(net);
  const grossAmount = finiteAmount(gross);

  return netAmount !== undefined && grossAmount !== undefined && grossAmount > 0
    ? netAmount / grossAmount
    : undefined;
}

export function prepareProductPrice (
  product: Product & { original_price?: number },
  discountedPrices: Record<string, ProductDiscountedPrice>
) {
  const prices = getProductPriceData(product, calculateProductDefaultBundleOptionsPrice);
  const override = getProductDiscountedPrice(product, discountedPrices);
  const paidRatio = netRatio(product.price, product.price_incl_tax);
  const regularRatio = netRatio(product.original_price, product.original_price_incl_tax);
  const regularGross = finiteAmount(override?.regular) ?? Math.max(prices.originalPriceInclTax, prices.priceInclTax);
  const paidGross = finiteAmount(override?.final) ?? prices.priceInclTax;
  const regular = Math.max(0, finiteAmount(regularGross * (regularRatio ?? paidRatio ?? 1)) ?? 0);
  const paid = Math.max(0, finiteAmount(paidGross * (paidRatio ?? regularRatio ?? 1)) ?? 0);

  return {
    price: Math.min(regular, paid),
    discount: Math.max(0, regular - paid)
  };
}
