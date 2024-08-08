import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';

export default function getCartItemKey (cartItem: CartItem): string {
  let key = cartItem.sku;

  if (cartItem.checksum) {
    key = key + '-' + cartItem.checksum;
  }

  if (cartItem.extension_attributes?.plushie_id) {
    key = key + '-' + cartItem.extension_attributes?.plushie_id;
  }

  return key;
}
