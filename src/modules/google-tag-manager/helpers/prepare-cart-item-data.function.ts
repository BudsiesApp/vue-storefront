import CartItem from 'core/modules/cart/types/CartItem';
import { getCartItemDiscount, getCartItemPrice, getFinalPrice } from 'src/modules/shared/helpers/price';

import { prepareBaseItemData } from './prepare-base-item-data.function';
import { getComposedSku } from './get-composed-sku.function';

export function prepareCartItemData (cartItem: CartItem) {
  const price = getCartItemPrice(cartItem, {}, false);
  const baseData = prepareBaseItemData(cartItem);

  return {
    ...baseData,
    item_variant: getComposedSku(cartItem),
    discount: getCartItemDiscount(cartItem, false, false),
    price: getFinalPrice(price)
  }
}
