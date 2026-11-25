import * as types from '@vue-storefront/core/modules/cart/store/mutation-types'
import { Logger } from '@vue-storefront/core/lib/logger'
import config from 'config'
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'
import { CartService } from '@vue-storefront/core/data-resolver'
import { createDiffLog } from '@vue-storefront/core/modules/cart/helpers'
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'

interface ConnectOptions {
  guestCart?: boolean,
  forceClientState?: boolean,
  isCartSyncRecovery?: boolean
}

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
  async clear ({ commit, dispatch, state }, { disconnect = true, sync = true } = {}) {
    commit(types.CART_RESET_TOTALS_SYNC)
    await commit(types.CART_LOAD_CART, [])

    if (sync) {
      await dispatch('sync', { forceClientState: true, forceSync: true })
    }

    if (disconnect) {
      commit(types.CART_SET_PENDING_COUPON, null)
      await commit(types.CART_SET_ITEMS_HASH, null)
      await dispatch('disconnect')

      if (state.syncPromise) {
        // The reconnect synchronizes the cart, which queues behind the running synchronization. When this action
        // is called from within that synchronization (for example by a totals refresh that finds the cart
        // missing), awaiting it would wait for itself forever, so it starts after the synchronization finished.
        dispatch('trackConnection', async () => {
          await dispatch('waitForCartSync')
          await dispatch('synchronizeCart')
        })
          .catch((error) => Logger.error(error, 'cart')())

        return
      }

      await dispatch('synchronizeCart');
    }
  },
  async disconnect ({ commit }) {
    commit(types.CART_LOAD_CART_SERVER_TOKEN, null);
  },
  async mergeGuestAndCustomer ({ dispatch }): Promise<void> {
    return dispatch('trackConnection', () => dispatch('performGuestCustomerMerge'))
  },
  async performGuestCustomerMerge ({ commit, dispatch, getters }): Promise<void> {
    const cartToken = getters.getCartToken;
    const isCartEmpty = !getters.getCartItems.length;
    const shouldMergeCart = cartToken && !isCartEmpty;

    if (!shouldMergeCart) {
      return dispatch('synchronizeCart');
    }

    const { result, resultCode } = await CartService.mergeGuestAndCustomer();

    if (resultCode === 200) {
      Logger.info('Customer and guest carts are merged.', 'cart', result)();
      commit(types.CART_LOAD_CART_SERVER_TOKEN, result);
      await dispatch('pullServerCart', true);
    }
  },
  async connect (
    { dispatch }, options: ConnectOptions = {}
  ) {
    return dispatch('trackConnection', () => dispatch('performConnect', options))
  },
  async performConnect (
    { getters, rootGetters, dispatch, commit },
    { guestCart = false, forceClientState = false, isCartSyncRecovery = false }: ConnectOptions = {}
  ) {
    if (!getters.isCartSyncEnabled) return
    const userToken = rootGetters['user/getToken'];

    const { result, resultCode } = await CartService.getCartToken(guestCart, forceClientState);

    if (resultCode === 200) {
      Logger.info('Server cart token created.', 'cart', result)();
      commit(types.CART_LOAD_CART_SERVER_TOKEN, result);

      EventBus.$emit('cart-connected', { cartId: result, userToken });
      const syncAction = isCartSyncRecovery ? 'performSync' : 'sync'
      return dispatch(syncAction, { forceClientState, dryRun: !config.cart.serverMergeByDefault });
    }

    if (resultCode === 401 && getters.bypassCounter < config.queues.maxCartBypassAttempts) {
      Logger.log('Bypassing with guest cart' + getters.bypassCounter, 'cart')()
      commit(types.CART_UPDATE_BYPASS_COUNTER, { counter: 1 })
      Logger.error(result, 'cart')()
      return dispatch('connect', isCartSyncRecovery
        ? { guestCart: true, isCartSyncRecovery: true }
        : { guestCart: true })
    }

    Logger.warn('Cart sync is disabled by the config', 'cart')()
    return createDiffLog()
  },
  /**
   * Create cart token when there are products in cart and we don't have token already
   */
  async create (
    { dispatch, getters },
    { ignoreClientItemsCount } = { ignoreClientItemsCount: false }
  ) {
    const storedItems = getters['getCartItems'] || []
    const cartToken = getters['getCartToken']

    if ((storedItems.length || ignoreClientItemsCount) && !cartToken) {
      Logger.info('Creating server cart token', 'cart')()
      return dispatch('connect', { guestCart: false })
    }

    EventBus.$emit('cart-created', cartToken)
  }
}

export default connectActions
