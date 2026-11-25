import type Product from '@vue-storefront/core/modules/catalog/types/Product';
import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import type { ProductDiscountedPrice } from '@vue-storefront/core/modules/catalog';
import { getCartItemDiscountedPrice, getProductDiscountedPrice } from '@vue-storefront/core/helpers/product-discounted-price';
import {
  calculateCartItemBundleOptionsPrice,
  calculateProductDefaultBundleOptionsPrice,
  getProductPriceData
} from '@vue-storefront/core/helpers/price';

import { normalizeUnitAmount } from './normalize-item-amounts.function';

type ProductPriceData = ReturnType<typeof getProductPriceData>;

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

// Removes tax once from the tax-inclusive amounts, using the net/gross pairs of the product.
function toNetUnitPrice (
  product: Product & { original_price?: number },
  prices: ProductPriceData,
  override: ProductDiscountedPrice | undefined
) {
  const paidRatio = netRatio(product.price, product.price_incl_tax);
  const regularRatio = netRatio(product.original_price, product.original_price_incl_tax);
  const regularGross = finiteAmount(override?.regular) ?? Math.max(prices.originalPriceInclTax, prices.priceInclTax);
  const paidGross = finiteAmount(override?.final) ?? prices.priceInclTax;
  const regular = Math.max(0, finiteAmount(regularGross * (regularRatio ?? paidRatio ?? 1)) ?? 0);
  const paid = Math.max(0, finiteAmount(paidGross * (paidRatio ?? regularRatio ?? 1)) ?? 0);

  return {
    price: normalizeUnitAmount(Math.min(regular, paid)),
    discount: normalizeUnitAmount(regular - paid)
  };
}

// Product and listing events: a bundle is priced with its default options.
export function prepareProductPrice (
  product: Product & { original_price?: number },
  discountedPrices: Record<string, ProductDiscountedPrice>
) {
  return toNetUnitPrice(
    product,
    getProductPriceData(product, calculateProductDefaultBundleOptionsPrice),
    getProductDiscountedPrice(product, discountedPrices)
  );
}

// A product that is being added to the cart: a bundle is priced with the options the customer selected.
export function prepareCartLinePrice (
  cartItem: CartItem & { original_price?: number },
  discountedPrices: Record<string, ProductDiscountedPrice>
) {
  return toNetUnitPrice(
    cartItem,
    getProductPriceData(cartItem, calculateCartItemBundleOptionsPrice),
    getCartItemDiscountedPrice(cartItem, discountedPrices)
  );
}
