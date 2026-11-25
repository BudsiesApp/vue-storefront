import { Store } from 'vuex';

import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import { productsEquals } from '@vue-storefront/core/modules/cart/helpers';
import RootState from '@vue-storefront/core/types/RootState';
import type { DiffLog } from '@vue-storefront/core/modules/cart/helpers/createDiffLog';
import { PriceHelper } from 'src/modules/shared';

import { prepareCartItemData } from './prepare-cart-item-data.function';

export function prepareAddedCartItemData (
  addedProduct: CartItem,
  diffLog: DiffLog | undefined,
  store: Store<RootState>
) {
  const cartLine: CartItem | undefined = store.getters['cart/getCartItems'].find(item => productsEquals(item, addedProduct));
  const sku = cartLine?.sku ?? addedProduct.sku;
  // Cart hydration uses the catalog item for this SKU. Before that background work finishes,
  // use the loaded configurable child, since the configured product keeps the parent's name.
  const catalogProduct = store.getters['product/getProductBySkuDictionary']?.[sku];
  const namedProduct = catalogProduct?.configurable_children?.find(child => child.sku === sku) ?? catalogProduct;
  const name = namedProduct?.name || addedProduct.configurable_children?.find(child => child.sku === sku)?.name || cartLine?.name || addedProduct.name;

  if (cartLine?.server_item_id != null) {
    const write = diffLog?.serverResponses.find(({ status, result }) => status === 200 && result?.item_id === cartLine.server_item_id);
    if (write) {
      const writtenLine = {
        ...cartLine,
        name,
        qty: addedProduct.qty,
        category: addedProduct.category ?? cartLine.category,
        category_ids: addedProduct.category_ids ?? cartLine.category_ids,
        extension_attributes: {
          ...cartLine.extension_attributes,
          budsies_quote_item_totals: write.result.extension_attributes?.budsies_quote_item_totals
        }
      };
      if (PriceHelper.hasCartItemTotals(writtenLine)) return prepareCartItemData(writtenLine, store);
    }
  }

  // No amounts from this write: use selected-option pricing, not a DTO retained from a previous cart or order.
  return prepareCartItemData({
    ...addedProduct,
    name,
    extension_attributes: { ...addedProduct.extension_attributes, budsies_quote_item_totals: undefined }
  }, store);
}
