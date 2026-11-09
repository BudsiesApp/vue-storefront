import { Store } from 'vuex';

import RootState from '@vue-storefront/core/types/RootState';
import Product from 'core/modules/catalog/types/Product';

import { prepareBaseItemData } from './prepare-base-item-data.function';
import { prepareProductPrice } from './prepare-item-price.function';
import { normalizeItemQuantity } from './normalize-item-amounts.function';

export function prepareProductItemData (
  product: Product,
  store: Store<RootState>
) {
  const baseData = prepareBaseItemData(product);

  return {
    ...baseData,
    quantity: normalizeItemQuantity(product.qty, 1),
    ...prepareProductPrice(product, store.state.product.productDiscountedPrice)
  }
}
