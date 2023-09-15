import { currentStoreView } from 'core/lib/multistore';
import Product from 'core/modules/catalog/types/Product';

import { prepareProductCategories } from './prepare-product-categories.function';

export function prepareBaseItemData (product: Product) {
  const storeView = currentStoreView();

  return {
    affiliation: storeView.name,
    item_id: product.sku,
    item_name: product.name,
    item_category: prepareProductCategories(product)
  }
}
