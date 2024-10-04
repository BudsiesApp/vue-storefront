import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import * as types from './mutation-types'
import { ActionTree } from 'vuex'
import RootState from '@vue-storefront/core/types/RootState'
import OrderState from '../types/OrderState'
import { Order } from '../types/Order'
import { isOnline } from '@vue-storefront/core/lib/search'
import i18n from '@vue-storefront/i18n'
import { OrderService } from '@vue-storefront/core/data-resolver'
import { sha3_224 } from 'js-sha3'
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'
import { Logger } from '@vue-storefront/core/lib/logger'
import config from 'config'
import { orderHooksExecutors } from '../hooks'
import * as entities from '@vue-storefront/core/lib/store/entities'
import { prepareOrder, optimizeOrder } from './../helpers'
import { ProcessOrderError } from '../types/ProcessOrderError'
import { ORDER_CONFLICT_EVENT } from '../types/OrderConflictEvent'

const actions: ActionTree<OrderState, RootState> = {
  /**
   * Place order - send it to service worker queue
   * @param {Object} commit method
   * @param {Order} order order data to be send
   */
  async placeOrder ({ commit, getters, dispatch }, newOrder: Order) {
    // Check if order is already processed/processing
    const currentOrderHash = sha3_224(JSON.stringify(newOrder))
    const isAlreadyProcessed = getters.getSessionOrderHashes.includes(currentOrderHash)
    if (isAlreadyProcessed) return
    commit(types.ORDER_ADD_SESSION_STAMPS, newOrder)
    commit(types.ORDER_ADD_SESSION_ORDER_HASH, currentOrderHash)
    const preparedOrder = prepareOrder(newOrder)

    EventBus.$emit('order-before-placed', { order: preparedOrder })
    const order = orderHooksExecutors.beforePlaceOrder(preparedOrder)

    if (!isOnline()) {
      dispatch('enqueueOrder', { newOrder: order })
      EventBus.$emit('order-after-placed', { order })
      orderHooksExecutors.beforePlaceOrder({ order, task: { resultCode: 200 } })
      return { resultCode: 200 }
    }

    EventBus.$emit('notification-progress-start', i18n.t('Processing order...'))

    try {
      return await dispatch('processOrder', { newOrder: order, currentOrderHash })
    } catch (error) {
      dispatch('handlePlacingOrderFailed', { newOrder: order, currentOrderHash })
      throw error
    }
  },
  async processOrder ({ commit, dispatch }, { newOrder, currentOrderHash }) {
    const order = { ...newOrder, transmited: true }
    const task = await OrderService.placeOrder(optimizeOrder(newOrder))

    if (task.resultCode === 404) {
      commit(types.ORDER_REMOVE_SESSION_ORDER_HASH, currentOrderHash);
      EventBus.$emit('cart-not-found-error');
      EventBus.$emit('notification-progress-stop');
      return task;
    }

    if (task.resultCode === 409) {
      commit(types.ORDER_REMOVE_SESSION_ORDER_HASH, currentOrderHash);
      EventBus.$emit(ORDER_CONFLICT_EVENT);
      EventBus.$emit('notification-progress-stop');
      return task;
    }

    if (task.resultCode === 200) {
      dispatch('enqueueOrder', { newOrder: order })

      commit(types.ORDER_LAST_ORDER_WITH_CONFIRMATION, { order, confirmation: task.result })
      orderHooksExecutors.afterPlaceOrder({ order, task })
      EventBus.$emit('order-after-placed', { order, confirmation: task.result })
      EventBus.$emit('notification-progress-stop')
      return task
    }

    if (task.resultCode === 400) {
      commit(types.ORDER_REMOVE_SESSION_ORDER_HASH, currentOrderHash)

      Logger.error('Internal validation error; Order entity is not compliant with the schema: ' + JSON.stringify(task.result), 'orders')()

      if ((config as any).orders.enqueueOrderOnPlacingFailed) {
        dispatch('enqueueOrder', { newOrder: order })
      }

      EventBus.$emit('notification-progress-stop')
      return task
    }
    EventBus.$emit('notification-progress-stop')
    throw new ProcessOrderError(task.result, task.resultCode);
  },
  handlePlacingOrderFailed ({ commit, dispatch }, { newOrder, currentOrderHash }) {
    const order = { ...newOrder, transmited: false }
    commit(types.ORDER_REMOVE_SESSION_ORDER_HASH, currentOrderHash)

    if ((config as any).orders.enqueueOrderOnPlacingFailed) {
      dispatch('enqueueOrder', { newOrder: order })
    }

    EventBus.$emit('notification-progress-stop')
  },
  enqueueOrder (context, { newOrder }) {
    const orderId = entities.uniqueEntityId(newOrder)
    const ordersCollection = StorageManager.get('orders')
    const order = {
      ...newOrder,
      order_id: orderId.toString(),
      created_at: new Date(),
      updated_at: new Date()
    }

    ordersCollection.setItem(orderId.toString(), order, (err, resp) => {
      if (err) Logger.error(err, 'orders')()

      if (!order.transmited) {
        EventBus.$emit('order/PROCESS_QUEUE', { config: config })
      }

      Logger.info('Order placed, orderId = ' + orderId, 'orders')()
    }).catch((reason) => Logger.error(reason, 'orders'))
  }
}

export default actions
