import { Store } from 'vuex';

import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import { productsEquals } from '@vue-storefront/core/modules/cart/helpers';
import RootState from '@vue-storefront/core/types/RootState';

import { prepareCartItemData } from './prepare-cart-item-data.function';
import { prepareProductPrice } from './prepare-item-price.function';

export function getAddedQuantity (addedProduct: CartItem): number {
  return parseInt(String(addedProduct.qty || 1), 10);
}

export function findAddedCartLine (addedProduct: CartItem, cartItems: CartItem[]): CartItem | undefined {
  const cartLine = cartItems.find((cartItem) => productsEquals(cartItem, addedProduct));

  if (!cartLine) {
    return;
  }

  return {
    ...cartLine,
    qty: getAddedQuantity(addedProduct),
    category: addedProduct.category ?? cartLine.category,
    category_ids: addedProduct.category_ids ?? cartLine.category_ids
  };
}

export function prepareAddedCartItemData (
  addedProduct: CartItem,
  addedCartLine: CartItem | undefined,
  store: Store<RootState>
) {
  if (addedCartLine?.extension_attributes?.budsies_quote_item_totals) {
    return prepareCartItemData(addedCartLine, store);
  }

  const item = prepareCartItemData({ ...addedProduct, qty: getAddedQuantity(addedProduct) }, store);

  if (!item.quantity) {
    return item;
  }

  return {
    ...item,
    ...prepareProductPrice(addedProduct, store.state.product.productDiscountedPrice)
  };
}
