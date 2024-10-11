import get from 'lodash-es/get'
import { BundleOptionsProductLink, SelectedBundleOption } from '@vue-storefront/core/modules/catalog/types/BundleOption';
import { getBundleOptionsValues, getDefaultBundleOptions } from '@vue-storefront/core/modules/catalog/helpers/bundleOptions';
import Product from '@vue-storefront/core/modules/catalog/types/Product';

function getBundleOptionDiscountPrice (
  bundleOptionValues: BundleOptionsProductLink[],
  productDiscount: Record<string, number>
): number | undefined {
  let isDiscounted = false;

  const price = bundleOptionValues.map((optionValue) => {
    const product = optionValue.product;

    if (!product || !product.id) {
      return optionValue.price || 0;
    }

    const productPrice = productDiscount[product.id];

    if (productPrice) {
      isDiscounted = true;
    }

    return productPrice || product.special_price_incl_tax || product.priceInclTax || product.price_incl_tax || 0;
  }).reduce((productPrice, totalPrice) => (totalPrice + productPrice), 0);

  if (!isDiscounted || !price) {
    return;
  }

  return price;
}

export function getBundleCartItemDiscountPrice (
  product: Product,
  productDiscount: Record<string, number>
): number | undefined {
  const allBundleOptions = product.bundle_options || [];

  const selectedBundleOptions = Object.values(
    get(
      product,
      'product_option.extension_attributes.bundle_options',
      {}
    )
  );
  const bundleOptionsValues = getBundleOptionsValues(
    selectedBundleOptions as SelectedBundleOption[],
    allBundleOptions
  );

  return getBundleOptionDiscountPrice(bundleOptionsValues, productDiscount);
}

export function getBundleProductDefaultDiscountPrice (
  product: Product,
  productDiscount: Record<string, number>
): number | undefined {
  const allBundleOptions = product.bundle_options || [];

  const defaultBundleOptions = getDefaultBundleOptions(product);
  const bundleOptionsValues = getBundleOptionsValues(
    defaultBundleOptions as SelectedBundleOption[],
    allBundleOptions
  );

  return getBundleOptionDiscountPrice(bundleOptionsValues, productDiscount);
}
