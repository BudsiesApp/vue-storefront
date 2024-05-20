import Product from '@vue-storefront/core/modules/catalog/types/Product';

import { Customization } from '..';

export function getCustomizationsFromProduct (product: Product): Customization[] {
  if (!product.customizations) {
    return [];
  }

  return JSON.parse(product.customizations) || [];
}
