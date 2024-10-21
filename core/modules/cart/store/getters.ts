import { GetterTree } from 'vuex'
import sumBy from 'lodash-es/sumBy'
import CartState from '../types/CartState'
import RootState from '@vue-storefront/core/types/RootState'
import AppliedCoupon from '../types/AppliedCoupon'
import { onlineHelper, isServer, calcItemsHmac } from '@vue-storefront/core/helpers'
import { calculateTotals } from '@vue-storefront/core/modules/cart/helpers'
import config from 'config'
import { AmGiftCardType } from 'src/modules/gift-card'
import { Dictionary } from 'src/modules/budsies'
import { PriceHelper } from 'src/modules/shared'
import { PROMOTION_PLATFORM_PRODUCT_DISCOUNT_GETTER } from 'src/modules/promotion-platform'

import CartItem from '../types/CartItem'

const getters: GetterTree<CartState, RootState> = {
  getCartToken: state => state.cartServerToken,
  getLastSyncDate: state => state.cartServerLastSyncDate,
  getLastTotalsSyncDate: state => state.cartServerLastTotalsSyncDate,
  getShippingMethod: state => state.shipping,
  getPaymentMethod: state => state.payment,
  getLastCartHash: state => state.cartItemsHash,
  getCurrentCartHash: state => calcItemsHmac(state.cartItems, state.cartServerToken),
  isCartHashChanged: (state, getters) => getters.getCurrentCartHash !== state.cartItemsHash,
  isSyncRequired: (state, getters) => getters.isCartHashEmptyOrChanged || !state.cartServerLastSyncDate,
  isTotalsSyncRequired: (state, getters) => getters.isCartHashEmptyOrChanged || !state.cartServerLastTotalsSyncDate,
  isCartHashEmptyOrChanged: (state, getters) => !state.cartItemsHash || getters.isCartHashChanged,
  getCartItems: state => state.cartItems,
  isTotalsSyncEnabled: () => config.cart.synchronize_totals && onlineHelper.isOnline && !isServer,
  isCartConnected: state => !!state.cartServerToken,
  isCartSyncEnabled: () => config.cart.synchronize && onlineHelper.isOnline && !isServer,
  getFirstShippingMethod: state => state.shipping instanceof Array ? state.shipping[0] : state.shipping,
  getFirstPaymentMethod: state => state.payment instanceof Array ? state.payment[0] : state.payment,
  getTotals: ({ cartItems, platformTotalSegments }, getters) =>
    (platformTotalSegments && onlineHelper.isOnline) ? platformTotalSegments : calculateTotals(getters.getFirstShippingMethod, getters.getFirstPaymentMethod, cartItems),
  getItemsTotalQuantity: ({ cartItems }) => config.cart.minicartCountType === 'items' ? cartItems.length : sumBy(cartItems, p => p.qty),
  getCoupon: ({ platformTotals }): AppliedCoupon | false =>
    !(platformTotals && platformTotals.hasOwnProperty('coupon_code')) ? false : { code: platformTotals.coupon_code, discount: platformTotals.discount_amount },
  isVirtualCart: ({ cartItems }) => cartItems.length ? cartItems.every(itm =>
    itm.type_id === 'downloadable' ||
    itm.type_id === 'virtual' ||
    (itm.type_id === 'giftvoucher' && itm.giftcard_options && itm.giftcard_options.recipient_ship === undefined)
    || (itm.type_id === 'amgiftcard' && itm.product_option?.extension_attributes?.am_giftcard_options?.am_giftcard_type === AmGiftCardType.VIRTUAL)
  ) : false,
  canUpdateMethods: (state, getters) => getters.isCartSyncEnabled && getters.isCartConnected,
  canSyncTotals: (state, getters) => getters.isTotalsSyncEnabled && getters.isCartConnected,
  isCartEmpty: state => state.cartItems.length === 0,
  bypassCounter: state => state.connectBypassCount,
  getShippingMethodCode: state => state.shipping && state.shipping.method_code,
  getPaymentMethodCode: state => state.payment && state.payment.code,
  getIsAdding: state => state.isAddingToCart,
  getIsMicroCartOpen: state => state.isMicrocartOpen,
  isLocalDataLoaded: state => state.isLocalDataLoaded,
  cartItemPriceDictionary: (
    state,
    getters,
    rootState,
    rootGetters
  ): Dictionary<PriceHelper.ProductPrice> => {
    const cartItems: CartItem[] = rootGetters['cart/getCartItems'];
    const cartItemPrices: Dictionary<PriceHelper.ProductPrice> = {};
    const productDiscountPriceDictionary = rootGetters[PROMOTION_PLATFORM_PRODUCT_DISCOUNT_GETTER];

    for (const cartItem of cartItems) {
      if (!cartItem.checksum) {
        continue;
      }

      cartItemPrices[cartItem.checksum] = PriceHelper.getCartItemPrice(
        cartItem,
        productDiscountPriceDictionary
      );
    }

    return cartItemPrices;
  },
  getCartItemPrice: (state, getters, rootState, rootGetters): (cartItem: CartItem) => PriceHelper.ProductPrice => {
    return (cartItem: CartItem) => {
      const price: PriceHelper.ProductPrice | undefined =
        cartItem.checksum
          ? getters['cartItemPriceDictionary'][cartItem.checksum]
          : undefined;

      const productDiscountPriceDictionary = rootGetters[PROMOTION_PLATFORM_PRODUCT_DISCOUNT_GETTER];

      if (price) {
        return price;
      }

      return PriceHelper.getCartItemPrice(
        cartItem,
        productDiscountPriceDictionary
      )
    }
  }

}

export default getters
