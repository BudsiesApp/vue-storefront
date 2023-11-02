import { CART_LOAD_CART_SERVER_TOKEN } from '@vue-storefront/core/modules/cart/store/mutation-types';

import getCartTokenCookieKey from './get-cart-token-cookie-key.function';

export function cacheHandlerFactory (Vue) {
  const cartTokenCookieKey = getCartTokenCookieKey();

  return (mutation, state) => {
    const type = mutation.type;

    if (type.endsWith(CART_LOAD_CART_SERVER_TOKEN)) {
      const token = mutation.payload;

      if (!token) {
        return Vue.$cookies.remove(
          cartTokenCookieKey
        )
      }

      return Vue.$cookies.set(
        cartTokenCookieKey,
        token,
        '3m',
        null,
        null,
        null,
        'Strict'
      )
    }
  }
}
