import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import { PriceHelper } from 'src/modules/shared';

import { prepareBaseItemData } from './prepare-base-item-data.function';
import { getComposedSku } from './get-composed-sku.function';

export function prepareCartItemData (
  cartItem: CartItem,
  price: PriceHelper.ProductPrice
) {
  const finalTotalPrice = PriceHelper.getFinalPrice(price);
  const itemPrice = finalTotalPrice / cartItem.qty;

  const baseData = prepareBaseItemData(cartItem);

  return {
    ...baseData,
    item_variant: getComposedSku(cartItem),
    discount: PriceHelper.getProductDiscount(price),
    price: itemPrice
  }
}
