import { Store } from 'vuex';

import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import RootState from '@vue-storefront/core/types/RootState';
import { normalizeProductPurchaseFlow, PriceHelper } from 'src/modules/shared';

import { prepareBaseItemData } from './prepare-base-item-data.function';
import { getComposedSku } from './get-composed-sku.function';
import { normalizeItemQuantity, normalizeUnitAmount } from './normalize-item-amounts.function';
import { prepareCartLinePrice } from './prepare-item-price.function';

// The server item totals are tax-exclusive. Without them (an offline or unsynchronized cart) the cart line price
// is derived from the tax-inclusive product data, so tax has to be removed from it.
function prepareUnitPrice (cartItem: CartItem, quantity: number, store: Store<RootState>) {
  if (!PriceHelper.hasCartItemTotals(cartItem)) {
    return prepareCartLinePrice(cartItem, store.state.cart.productDiscountedPrice);
  }

  const price = PriceHelper.getCartItemPrice({ ...cartItem, qty: quantity }, store.state.cart.productDiscountedPrice);

  return {
    price: normalizeUnitAmount(PriceHelper.getFinalPrice(price) / quantity),
    discount: normalizeUnitAmount(PriceHelper.getProductDiscount(price).discount / quantity)
  };
}

export function prepareCartItemData (
  cartItem: CartItem,
  store: Store<RootState>
) {
  const quantity = normalizeItemQuantity(cartItem.qty);
  const purchaseFlow = cartItem.extension_attributes?.flow;
  const baseData = prepareBaseItemData(cartItem);

  return {
    ...baseData,
    quantity,
    purchase_flow: normalizeProductPurchaseFlow(purchaseFlow),
    item_variant: getComposedSku(cartItem),
    ...prepareUnitPrice(cartItem, quantity, store)
  }
}
