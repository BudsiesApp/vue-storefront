import { Store } from 'vuex';

import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import { productsEquals } from '@vue-storefront/core/modules/cart/helpers';
import RootState from '@vue-storefront/core/types/RootState';
import { PriceHelper } from 'src/modules/shared';

import { prepareCartItemData } from './prepare-cart-item-data.function';
import { normalizeItemQuantity } from './normalize-item-amounts.function';

export function findAddedCartLine (addedProduct: CartItem, cartItems: CartItem[]): CartItem | undefined {
  const cartLine = cartItems.find((cartItem) => productsEquals(cartItem, addedProduct));

  if (!cartLine) {
    return;
  }

  return {
    ...cartLine,
    qty: normalizeItemQuantity(addedProduct.qty),
    category: addedProduct.category ?? cartLine.category,
    category_ids: addedProduct.category_ids ?? cartLine.category_ids
  };
}

export function prepareAddedCartItemData (
  addedProduct: CartItem,
  addedCartLine: CartItem | undefined,
  store: Store<RootState>
) {
  if (addedCartLine && PriceHelper.hasCartItemTotals(addedCartLine)) {
    return prepareCartItemData(addedCartLine, store);
  }

  // No synchronized line with item totals: price the added product itself, with the options the customer selected.
  return prepareCartItemData({ ...addedProduct, qty: normalizeItemQuantity(addedProduct.qty) }, store);
}
