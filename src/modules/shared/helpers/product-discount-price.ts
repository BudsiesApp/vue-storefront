import { BundleProductDiscountPrice } from 'src/modules/shared';

import { isBundleProduct } from '@vue-storefront/core/modules/catalog/helpers';
import Product from '@vue-storefront/core/modules/catalog/types/Product';

function getDiscountPrice (
  product: Product,
  productDiscount: Record<string, number>,
  bundlePriceCalculationFunction: (
    product: Product,
    productDiscount: Record<string, number>
  ) => (number | undefined)
): number | undefined {
  if (
    isBundleProduct(product)
  ) {
    return bundlePriceCalculationFunction(
      product,
      productDiscount
    );
  }

  if (!product.id) {
    return;
  }

  return productDiscount[product.id];
}

export function getProductDiscountPrice (
  product: Product,
  productDiscount: Record<string, number>
): number | undefined {
  return getDiscountPrice(
    product,
    productDiscount,
    BundleProductDiscountPrice.getBundleProductDefaultDiscountPrice
  );
}

export function getCartItemDiscountPrice (
  product: Product,
  productDiscount: Record<string, number>
): number | undefined {
  return getDiscountPrice(
    product,
    productDiscount,
    BundleProductDiscountPrice.getBundleCartItemDiscountPrice
  );
}
