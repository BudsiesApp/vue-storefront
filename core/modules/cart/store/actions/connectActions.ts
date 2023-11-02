import * as types from '@vue-storefront/core/modules/cart/store/mutation-types'
import { Logger } from '@vue-storefront/core/lib/logger'
import config from 'config'
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'
import { CartService } from '@vue-storefront/core/data-resolver'
import { createDiffLog } from '@vue-storefront/core/modules/cart/helpers'
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'

const connectActions = {
  toggleMicrocart ({ commit }) {
    commit(types.CART_TOGGLE_MICROCART)
  },
  /**
   * It will always clear cart items on frontend.
   * Options:
   * sync - if you want to sync it with backend.
   * disconnect - if you want to clear cart token.
   */
  async clear ({ commit, dispatch }, { disconnect = true, sync = true } = {}) {
    await commit(types.CART_LOAD_CART, [])
    if (sync) {
      await dispatch('sync', { forceClientState: true, forceSync: true })
    }
    if (disconnect) {
      await commit(types.CART_SET_ITEMS_HASH, null)
      await dispatch('disconnect')
    }
  },
  async disconnect ({ commit }) {
    commit(types.CART_LOAD_CART_SERVER_TOKEN, null)
  },
  async authorize ({ dispatch, getters }) {
    const coupon = getters.getCoupon.code
    if (coupon) {
      await dispatch('removeCoupon', { sync: false })
    }

    await dispatch('connect', { guestCart: false })

    if (coupon) {
      await dispatch('applyCoupon', coupon)
    }
  },
  async mergeGuestAndCustomer({ commit, dispatch, getters }): Promise<void> {
    const cartToken = getters.getCartToken;
    const isCartEmpty = !getters.getCartItems.length;
    const shouldMergeCart = cartToken && !isCartEmpty;

    if (!shouldMergeCart) {
      return;
    }

    const {result, resultCode} = await CartService.mergeGuestAndCustomer();

    if (resultCode === 200) {
      Logger.info('Customer and guest carts are merged.', 'cart', result)();
      commit(types.CART_LOAD_CART_SERVER_TOKEN, result);
      await dispatch('pullServerCart');
    }
  },
  async connect ({ getters, rootGetters, dispatch, commit }, { guestCart = false, forceClientState = false }) {
    if (!getters.isCartSyncEnabled) return
    const userToken = rootGetters['user/getToken'];

    const { result, resultCode } = await CartService.getCartToken(guestCart, forceClientState);

    if (resultCode === 200) {
      Logger.info('Server cart token created.', 'cart', result)();
      commit(types.CART_LOAD_CART_SERVER_TOKEN, result);

      EventBus.$emit('cart-connected', {cartId: result, userToken});
      return dispatch('sync', { forceClientState, dryRun: !config.cart.serverMergeByDefault });
    }

    if (resultCode === 401 && getters.bypassCounter < config.queues.maxCartBypassAttempts) {
      Logger.log('Bypassing with guest cart' + getters.bypassCounter, 'cart')()
      commit(types.CART_UPDATE_BYPASS_COUNTER, { counter: 1 })
      Logger.error(result, 'cart')()
      return dispatch('connect', { guestCart: true })
    }

    Logger.warn('Cart sync is disabled by the config', 'cart')()
    return createDiffLog()
  },
  /**
   * Create cart token when there are products in cart and we don't have token already
   */
  async create ({ dispatch, getters }) {
    const storedItems = getters['getCartItems'] || []
    const cartToken = getters['getCartToken']
    if (storedItems.length && !cartToken) {
      Logger.info('Creating server cart token', 'cart')()
      return dispatch('connect', { guestCart: false })
    }

    EventBus.$emit('cart-created', cartToken)
  }
}

export default connectActions
