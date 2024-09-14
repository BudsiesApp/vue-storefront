import config from 'config'
import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';

const createCartItemForUpdate = (clientItem: CartItem, serverItem: any, updateIds: boolean = false, mergeQty: boolean = false): CartItem => {
  const sku = clientItem.parentSku && config.cart.setConfigurableProductOptions ? clientItem.parentSku : clientItem.sku
  const qty = mergeQty ? (clientItem.qty + serverItem.qty) : clientItem.qty

  if (clientItem.giftcard_options) {
    clientItem.giftcard_options.qty = qty;
  }

  const cartItem = {
    sku,
    ...((serverItem && serverItem.item_id) ? { item_id: serverItem.item_id } : {}),
    qty,
    product_option: clientItem.product_option,
    giftcard_options: clientItem.giftcard_options ? clientItem.giftcard_options : undefined,
    extension_attributes: clientItem.extension_attributes ? clientItem.extension_attributes : undefined,
  } as any as CartItem

  const quoteId = clientItem.server_cart_id || serverItem?.quote_id;
  const item_id = clientItem.server_item_id || serverItem?.item_id;

  if (quoteId && item_id) {
    return {
      ...cartItem,
      quoteId,
      item_id
    }
  }

  return cartItem
}

export default createCartItemForUpdate
