import { Store } from 'vuex';

import RootState from '@vue-storefront/core/types/RootState';
import Product from 'core/modules/catalog/types/Product';

import { prepareBaseItemData } from './prepare-base-item-data.function';
import { prepareProductPrice } from './prepare-item-price.function';

export function prepareProductItemData (
  product: Product,
  store: Store<RootState>
) {
  const baseData = prepareBaseItemData(product);

  return {
    ...baseData,
    ...prepareProductPrice(product, store.state.product.productDiscountedPrice)
  }
}
