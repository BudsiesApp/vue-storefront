import { Store } from 'vuex';

import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import RootState from '@vue-storefront/core/types/RootState';
import { normalizeProductPurchaseFlow, PriceHelper } from 'src/modules/shared';

import { prepareBaseItemData } from './prepare-base-item-data.function';
import { getComposedSku } from './get-composed-sku.function';
import { roundUnitAmount } from './round-unit-amount.function';

function normalizeQuantity (qty: unknown): number {
  const quantity = typeof qty === 'string' && qty.trim() ? Number(qty) : qty;

  return typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

export function prepareCartItemData (
  cartItem: CartItem,
  store: Store<RootState>
) {
  const quantity = normalizeQuantity(cartItem.qty);
  const purchaseFlow = cartItem.extension_attributes?.flow;
  const baseData = prepareBaseItemData(cartItem);

  if (!quantity) {
    return {
      ...baseData,
      quantity,
      purchase_flow: normalizeProductPurchaseFlow(purchaseFlow),
      item_variant: getComposedSku(cartItem),
      price: 0,
      discount: 0
    };
  }

  const price = PriceHelper.getCartItemPrice({ ...cartItem, qty: quantity }, store.state.cart.productDiscountedPrice);

  return {
    ...baseData,
    quantity,
    purchase_flow: normalizeProductPurchaseFlow(purchaseFlow),
    item_variant: getComposedSku(cartItem),
    price: roundUnitAmount(PriceHelper.getFinalPrice(price) / quantity),
    discount: roundUnitAmount(Math.max(0, PriceHelper.getProductDiscount(price).discount) / quantity)
  }
}
