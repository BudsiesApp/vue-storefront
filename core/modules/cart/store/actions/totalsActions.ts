import type { Commit } from 'vuex'
import type Task from 'core/lib/sync/types/Task'
import * as types from '@vue-storefront/core/modules/cart/store/mutation-types'
import { Logger } from '@vue-storefront/core/lib/logger'
import { CartService } from '@vue-storefront/core/data-resolver'
import {
  preparePaymentMethodsToSync,
  prepareShippingInfoForUpdateTotals,
  createOrderData,
  createShippingInfoData,
  getAvailableShippingMethod
} from '@vue-storefront/core/modules/cart/helpers'
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { isCartNotFoundError } from '../../helpers/is-cart-not-found-error'
import { createTotalsItemUpdate } from '../../helpers/create-totals-item-update.function'

// The totals are "syncing" until the response is fully applied, so that nothing reads the old totals
// as synchronized in between. Holds nest: the flag is released when the outermost one finishes.
async function holdTotalsSyncing<T> (commit: Commit, task: () => Promise<T>): Promise<T> {
  commit(types.START_TOTALS_SYNC);

  try {
    return await task();
  } finally {
    commit(types.FINISH_TOTALS_SYNC);
  }
}

const totalsActions = {
  async getTotals ({ commit }, { addressInformation, hasShippingInformation }) {
    return holdTotalsSyncing(commit, async () => {
      if (hasShippingInformation) {
        return CartService.setShippingInfo(addressInformation);
      }

      return CartService.getTotals();
    });
  },
  async overrideServerTotals ({ commit, state, getters, rootGetters, dispatch }, { addressInformation, hasShippingInformation }) {
    commit(types.START_TOTALS_REFRESH)

    // Refreshes can overlap and their responses can arrive in any order. The refresh that started last decides
    // the totals: the response or the failure of an older one must neither overwrite them nor invalidate them.
    const refreshId = state.totalsRefreshId
    const isSuperseded = () => state.totalsRefreshId !== refreshId
    // The answer is about the cart that was requested. When another cart replaced it in the meantime, for example
    // after a reconnect, applying it would give the current cart the totals of an old one, and clearing would
    // discard the current cart for the sake of an old one.
    const requestedCartToken = getters.getCartToken
    const isCartReplaced = () => getters.getCartToken !== requestedCartToken
    const isOutdated = () => isSuperseded() || isCartReplaced()

    return holdTotalsSyncing(commit, async () => {
      const task: Task = await dispatch('getTotals', { addressInformation, hasShippingInformation })
      const { resultCode, result } = task;

      if (isCartNotFoundError(task)) {
        if (isCartReplaced()) {
          Logger.info('Ignoring the cart-not-found response of a replaced cart.', 'cart')()

          return
        }

        await dispatch('clear', { disconnect: true, sync: false });
        return task
      }

      if (isOutdated()) {
        Logger.info('Ignoring the totals response of a superseded refresh or a replaced cart.', 'cart')()

        return
      }

      if (resultCode === 200) {
        // Line prices, totals and the sync date are applied in one go: nothing can wait between them, so no
        // newer refresh and no reconnect can start while only a part of the response is applied.
        const platformTotals = result.totals || result
        Logger.info('Overriding server totals. ', 'cart', platformTotals)()
        const itemsAfterPlatformTotals = prepareShippingInfoForUpdateTotals(platformTotals.items)

        for (let key of Object.keys(itemsAfterPlatformTotals)) {
          const product = createTotalsItemUpdate(itemsAfterPlatformTotals[key], getters.getCartItems)
          commit(types.CART_UPD_ITEM_PROPS, { product })
        }

        commit(types.CART_UPD_TOTALS, { itemsAfterPlatformTotals, platformTotals, platformTotalSegments: platformTotals.total_segments })
        commit(types.CART_SET_TOTALS_SYNC)

        // we received payment methods as a result of this call, updating state
        if (result.payment_methods && getters.canUpdateMethods) {
          const { uniqueBackendMethods, paymentMethods } = preparePaymentMethodsToSync(
            result.payment_methods.map(method => ({ ...method, is_server_method: true })),
            rootGetters['checkout/getNotServerPaymentMethods']
          )
          dispatch('checkout/replacePaymentMethods', paymentMethods, { root: true })
          EventBus.$emit('set-unique-payment-methods', uniqueBackendMethods)
        }

        return
      }

      Logger.error(result, 'cart')()
    });
  },
  async fetchTotals ({ dispatch, rootGetters }): Promise<void> {
    const shippingDetails = rootGetters['checkout/getShippingDetails'];
    const shippingMethods = rootGetters['checkout/getShippingMethods'];

    const shippingMethodsData = createOrderData({
      shippingDetails,
      shippingMethods,
      paymentMethods: rootGetters['checkout/getPaymentMethods'],
      paymentDetails: rootGetters['checkout/getPaymentDetails']
    });

    if (shippingMethodsData.country) {
      const availableShippingMethod = getAvailableShippingMethod(
        shippingDetails.shippingCarrier,
        shippingDetails.shippingMethod,
        shippingMethods
      );

      const hasShippingInformation = !!availableShippingMethod;
      const addressInformation = createShippingInfoData({
        ...shippingMethodsData,
        carrier_code: availableShippingMethod?.carrier_code,
        method_code: availableShippingMethod?.method_code
      });

      await dispatch('overrideServerTotals', { hasShippingInformation, addressInformation });
    }
  },
  async syncTotals ({ commit, state, dispatch, getters, rootGetters }, payload: { forceServerSync: boolean, methodsData?: any } = { forceServerSync: false, methodsData: null }) {
    const methodsData = payload ? payload.methodsData : null
    const isTotalsSyncNeeded = () => getters.canSyncTotals && (getters.isTotalsSyncRequired || payload.forceServerSync)

    const pullMethodsAndSyncTotals = async () => {
      await dispatch('pullMethods', { forceServerSync: payload.forceServerSync })

      if (isTotalsSyncNeeded()) {
        const shippingDetails = rootGetters['checkout/getShippingDetails'];
        const shippingMethods = rootGetters['checkout/getShippingMethods'];

        const shippingMethodsData = methodsData || createOrderData({
          shippingDetails,
          shippingMethods,
          paymentMethods: rootGetters['checkout/getPaymentMethods'],
          paymentDetails: rootGetters['checkout/getPaymentDetails']
        })

        if (shippingMethodsData.country) {
          const availableShippingMethod = getAvailableShippingMethod(
            shippingDetails.shippingCarrier,
            shippingDetails.shippingMethod,
            shippingMethods
          );

          const hasShippingInformation = !!availableShippingMethod;
          const addressInformation = createShippingInfoData({
            ...shippingMethodsData,
            carrier_code: availableShippingMethod?.carrier_code,
            method_code: availableShippingMethod?.method_code
          });

          return dispatch('overrideServerTotals', { hasShippingInformation, addressInformation })
        }

        Logger.error('Please do set the tax.defaultCountry in order to calculate totals', 'cart')()
      }
    }

    // Include the methods pull in the busy span, even before the totals request starts.
    if (isTotalsSyncNeeded()) {
      return holdTotalsSyncing(commit, pullMethodsAndSyncTotals)
    }

    return pullMethodsAndSyncTotals()
  },
  async refreshTotals ({ dispatch }, payload) {
    Logger.warn('The "cart/refreshTotals" action is deprecated and will not be supported with the Vue Storefront 1.11', 'cart')()
    await dispatch('syncTotals', payload)
  }
}

export default totalsActions
