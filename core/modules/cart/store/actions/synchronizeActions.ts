import * as types from '@vue-storefront/core/modules/cart/store/mutation-types'
import { Logger } from '@vue-storefront/core/lib/logger'
import { isServer } from '@vue-storefront/core/helpers'
import config from 'config'
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'
import { CartService } from '@vue-storefront/core/data-resolver'
import { createDiffLog } from '@vue-storefront/core/modules/cart/helpers'
import i18n from '@vue-storefront/i18n'
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { watch } from 'vue'
import { cartHooksExecutors } from '../../hooks'
import { LOCAL_CART_DATA_LOADED_EVENT } from '../../types/local-cart-data-loaded.event'

interface CartSyncOptions {
  forceClientState?: boolean,
  dryRun?: boolean,
  mergeQty?: boolean,
  forceSync?: boolean,
  forceUpdateServerItem?: boolean,
  waitForTotalsUpdate?: boolean,
  skipTotalsUpdate?: boolean
}

const synchronizeActions = {
  async load (
    { commit, dispatch },
    { forceClientState = false, forceSync = false }: { forceClientState?: boolean, forceSync?: boolean } = {}
  ) {
    if (isServer) return

    dispatch('setDefaultCheckoutMethods')
    const storedItems = await StorageManager.get('cart').getItem('current-cart')
    commit(types.CART_LOAD_CART, storedItems)
    const restore = dispatch('loadCartDataFromLocalStorage', { forceClientState, forceSync })

    cartHooksExecutors.afterLoad(storedItems)
    await restore
  },
  async loadCartDataFromLocalStorage ({ commit, dispatch }, { forceClientState, forceSync }) {
    const { synchronize } = config.cart
    const cartStorage = StorageManager.get('cart')
    const pendingCouponCode = await cartStorage.getItem('pending-coupon-code')

    if (pendingCouponCode) {
      commit(types.CART_SET_PENDING_COUPON, pendingCouponCode)
    }

    if (!synchronize) {
      commit(types.CART_SET_LOCAL_DATA_LOADED, true);
      EventBus.$emit(LOCAL_CART_DATA_LOADED_EVENT);
      return;
    }

    const token = await cartStorage.getItem('current-cart-token')
    const hash = await cartStorage.getItem('current-cart-hash')

    if (hash) {
      commit(types.CART_SET_ITEMS_HASH, hash)
      Logger.info('Cart hash received from cache.', 'cache', hash)()
    }

    if (token) {
      commit(types.CART_LOAD_CART_SERVER_TOKEN, token)
      Logger.info('Cart token received from cache.', 'cache', token)()
    }

    commit(types.CART_SET_LOCAL_DATA_LOADED, true);
    EventBus.$emit(LOCAL_CART_DATA_LOADED_EVENT);
  },
  async synchronizeCart ({ dispatch, rootGetters }) {
    const isUserAuthorized = rootGetters['user/getUserToken'];

    if (isUserAuthorized) {
      return dispatch('connect', { guestCart: false });
    }

    await dispatch('sync', {});

    return dispatch('create');
  },
  async waitForCartSync ({ state }) {
    while (state.syncPromise) {
      try {
        await state.syncPromise
      } catch {
        if (!state.syncPromise) {
          return
        }
      }
    }
  },
  async waitForStartup ({ state }) {
    try {
      await state.startupPromise
    } catch {
      // Startup settlement, rather than success, is the contract for callers.
    }
  },
  async waitForConnections ({ state }) {
    while (state.connectionPromises.length) {
      await Promise.all(state.connectionPromises.map(promise => promise.catch(() => undefined)))
    }
  },
  async waitForIdle ({ getters, dispatch, state }) {
    const isBusy = () => getters.getIsAdding || getters.IS_CART_SYNCING || getters.isTotalsSettling || getters.IS_COUPON_PROCESSING
    do {
      await dispatch('waitForConnections')
      await dispatch('waitForCartSync')
      if (isBusy()) {
        await new Promise<void>(resolve => {
          const stop = watch(isBusy, busy => { if (!busy) { stop(); resolve() } })
        })
      }
    } while (state.connectionPromises.length || isBusy())
  },
  async trackConnection ({ commit }, operation: () => Promise<unknown>) {
    let release: () => void = () => undefined
    const settled = new Promise<void>(resolve => { release = resolve })
    commit(types.ADD_CONNECTION_PROMISE, settled)
    try {
      return await operation()
    } finally {
      commit(types.REMOVE_CONNECTION_PROMISE, settled)
      release()
    }
  },
  /** @deprecated backward compatibility only */
  async serverPull ({ dispatch }, { forceClientState = false, dryRun = false }) {
    Logger.warn('The "cart/serverPull" action is deprecated and will not be supported with the Vue Storefront 1.11', 'cart')()
    return dispatch('sync', { forceClientState, dryRun })
  },
  async sync ({ commit, dispatch, state }, options: CartSyncOptions = {}) {
    const previousSyncPromise = state.syncPromise
    const waitForPreviousSync = previousSyncPromise
      ? previousSyncPromise.catch(() => undefined)
      : Promise.resolve()
    const syncPromise = waitForPreviousSync.then(async () => {
      const diffLog = await dispatch('performSync', options)
      await dispatch('applyPendingCouponInCartTransaction', options.skipTotalsUpdate ? { skipTotalsUpdate: true } : undefined)

      return diffLog
    })

    commit(types.SET_IS_CART_SYNCING, true)
    commit(types.SET_SYNC_PROMISE, syncPromise)

    try {
      return await syncPromise
    } finally {
      if (state.syncPromise === syncPromise) {
        commit(types.SET_SYNC_PROMISE, null)
        commit(types.SET_IS_CART_SYNCING, false)
      }
    }
  },
  async performSync (
    { getters, commit, dispatch },
    {
      forceClientState = false,
      dryRun = false,
      mergeQty = false,
      forceSync = false,
      forceUpdateServerItem = false,
      waitForTotalsUpdate = true,
      skipTotalsUpdate = false
    }: CartSyncOptions = {}
  ) {
    const { getCartItems, canUpdateMethods, isSyncRequired } = getters
    if ((!canUpdateMethods || !isSyncRequired) && !forceSync) return createDiffLog()

    const task = await CartService.getItems()
    const { result, resultCode } = task

    if (resultCode === 200) {
      if (Array.isArray(result)) {
        result.forEach((item) => {
          const sku = item.product_type === 'bundle'
            ? item.sku.split('-')[0]
            : item.sku;

          item.sku = sku;
        });
      }

      const { serverItems, clientItems } = cartHooksExecutors.beforeSync({ clientItems: getCartItems, serverItems: result })

      const diffLog = await dispatch('merge', {
        dryRun,
        serverItems,
        clientItems,
        forceClientState,
        mergeQty,
        forceUpdateServerItem,
        waitForTotalsUpdate,
        ...(skipTotalsUpdate ? { skipTotalsUpdate } : {})
      })
      cartHooksExecutors.afterSync(diffLog)
      commit(types.CART_SET_SYNC)
      return diffLog
    }

    const diffLog = createDiffLog()

    if (resultCode === 404) {
      dispatch(
        'clear',
        {
          disconnect: true,
          sync: false
        }
      );
      // The cart no longer exists and was cleared together with the local changes, so the change is lost and
      // callers must know. Nothing stays behind that a repeated action could apply twice.
      diffLog.pushServerResponse({ status: resultCode, sku: '', result: task })

      return diffLog
    }

    // The items are not rejected, the synchronization failed. The local changes stay in the cart and the cart
    // hash still differs, so a later synchronization sends them. Reporting the failure as the response of an
    // item would make the caller show an error for a change that stays, and a retry would apply it twice.
    Logger.error(result, 'cart')()
    cartHooksExecutors.afterSync(result)

    return diffLog
  },
  async stockSync ({ dispatch, commit, getters }, stockTask) {
    const product = { sku: stockTask.product_sku }

    const cartItem = await dispatch('getItem', { product })

    if (!cartItem || stockTask.result.code === 'ENOTFOUND') return

    if (!stockTask.result.is_in_stock) {
      if (!config.stock.allowOutOfStockInCart && !config.cart.synchronize) {
        Logger.log('Removing product from cart' + stockTask.product_sku, 'stock')()
        commit(types.CART_DEL_ITEM, { product: { sku: stockTask.product_sku } }, { root: true })
        return
      }

      dispatch('updateItem', {
        product: { errors: { stock: i18n.t('Out of the stock!') }, sku: stockTask.product_sku, is_in_stock: false }
      })

      return
    }

    dispatch('updateItem', {
      product: { info: { stock: i18n.t('In stock!') }, sku: stockTask.product_sku, is_in_stock: true }
    })
    EventBus.$emit('cart-after-itemchanged', { item: cartItem })
    commit(types.CART_SET_ITEMS_HASH, getters.getCurrentCartHash)
  },
  async pullServerCart ({ dispatch }, forceSync = false): Promise<any> {
    await dispatch('clear', { disconnect: false, sync: false });
    const diffLog = await dispatch('sync', { forceSync });

    await dispatch('syncTotals', { forceServerSync: true });

    return diffLog;
  },
  async pullEstimatedShipments ({ dispatch, commit }): Promise<any> {
    const { result, resultCode } = await CartService.getItems();

    if (resultCode === 404) {
      dispatch(
        'clear',
        {
          disconnect: true,
          sync: false
        }
      );
      return createDiffLog();
    }

    if (resultCode !== 200) {
      return;
    }

    result.forEach((item) => {
      const sku = item.product_type === 'bundle'
        ? item.sku.split('-')[0]
        : item.sku;

      item.sku = sku;

      commit(types.CART_UPDATE_ITEM_ESTIMATED_SHIPMENT, item);
    });
  }
}

export default synchronizeActions
