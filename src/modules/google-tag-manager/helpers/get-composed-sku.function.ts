import { getBundleOptionsValues, getSelectedBundleOptions } from '@vue-storefront/core/modules/catalog/helpers/bundleOptions';
import Product from 'core/modules/catalog/types/Product';

export function getComposedSku (product: Product) {
  const selectedBundleOptions = getSelectedBundleOptions(product);
  const selectedBundleOptionsValues = getBundleOptionsValues(selectedBundleOptions, product.bundle_options || []);

  let sku = product.sku;

  for (const value of selectedBundleOptionsValues) {
    sku += `-${value.sku}`;
  }

  return sku;
}
