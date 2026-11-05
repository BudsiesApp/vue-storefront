import { Store } from 'vuex';

import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import RootState from '@vue-storefront/core/types/RootState';
import { normalizeProductPurchaseFlow, PriceHelper } from 'src/modules/shared';

import { prepareBaseItemData } from './prepare-base-item-data.function';
import { getComposedSku } from './get-composed-sku.function';

export function prepareCartItemData (
  cartItem: CartItem,
  store: Store<RootState>
) {
  const price = PriceHelper.getCartItemPrice(cartItem, store.state.cart.productDiscountedPrice);
  const quantity = Number.isFinite(cartItem.qty) && cartItem.qty > 0 ? cartItem.qty : 0;
  const purchaseFlow = cartItem.extension_attributes?.flow;

  const baseData = prepareBaseItemData(cartItem);

  return {
    ...baseData,
    purchase_flow: normalizeProductPurchaseFlow(purchaseFlow),
    item_variant: getComposedSku(cartItem),
    price: quantity ? PriceHelper.getFinalPrice(price) / quantity : 0,
    discount: quantity ? Math.max(0, PriceHelper.getProductDiscount(price).discount) / quantity : 0
  }
}
