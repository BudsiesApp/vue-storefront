import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { isServer } from '@vue-storefront/core/helpers'
import { Logger } from '@vue-storefront/core/lib/logger'
import { StorefrontModule } from '@vue-storefront/core/lib/modules'
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'

import { useOrderCreation } from './composables/use-order-creation'
import { checkoutModule } from './store/checkout'
import { paymentModule } from './store/payment'
import { shippingModule } from './store/shipping'
import * as types from './store/checkout/mutation-types'
import { ORDER_ERROR_EVENT } from './types/OrderErrorEvent'
import { CHECKOUT_USE_SHIPPING_ADDRESS_AS_BILLING } from './store/checkout/getter-types'

export const CheckoutModule: StorefrontModule = function ({ store }) {
  StorageManager.init('checkout')

  store.registerModule('shipping', shippingModule)
  store.registerModule('payment', paymentModule)
  store.registerModule('checkout', checkoutModule)

  store.subscribe((mutation, state) => {
    const type = mutation.type

    if (
      type.endsWith(types.CHECKOUT_SAVE_PERSONAL_DETAILS) ||
      type.endsWith(types.CHECKOUT_RESET_PERSONAL_DETAILS)
    ) {
      StorageManager.get('checkout').setItem('personal-details', state.checkout.personalDetails).catch((reason) => {
        Logger.error(reason)() // it doesn't work on SSR
      }) // populate cache
    }

    if (
      type.endsWith(types.CHECKOUT_SAVE_SHIPPING_DETAILS) ||
      type.endsWith(types.CHECKOUT_UPDATE_PROP_VALUE) ||
      type.endsWith(types.CHECKOUT_RESET_SHIPPING_DETAILS) ||
      type.endsWith(types.CHECKOUT_UPDATE_SHIPPING_DETAILS)
    ) {
      StorageManager.get('checkout').setItem('shipping-details', state.checkout.shippingDetails).catch((reason) => {
        Logger.error(reason)() // it doesn't work on SSR
      }) // populate cache
    }

    if (
      type.endsWith(types.CHECKOUT_SAVE_PAYMENT_DETAILS) ||
      type.endsWith(types.CHECKOUT_UPDATE_PAYMENT_DETAILS) ||
      type.endsWith(types.CHECKOUT_RESET_PAYMENT_DETAILS) ||
      type.endsWith(types.CHECKOUT_COPY_SHIPPING_TO_BILLING_ADDRESS)
    ) {
      StorageManager.get('checkout').setItem('payment-details', state.checkout.paymentDetails).catch((reason) => {
        Logger.error(reason)() // it doesn't work on SSR
      }) // populate cache
    }

    if (
      type.endsWith(types.CHECKOUT_SET_USE_SHIPPING_AS_BILLING)
    ) {
      StorageManager.get('checkout').setItem('use-shipping-as-billing', state.checkout.useShippingAddressAsBilling).catch((reason) => {
        Logger.error(reason)();
      });
    }
  });

  if (!isServer) {
    store.dispatch('checkout/load');
    const onClearUserData = () => store.dispatch('checkout/resetDetails');
    EventBus.$on('clear-user-data', onClearUserData);
  }
}

const CHECKOUT_UPDATE_SHIPPING_DETAILS_MUTATION = `checkout/${types.CHECKOUT_UPDATE_SHIPPING_DETAILS}`;
const CHECKOUT_UPDATE_PAYMENT_DETAILS_MUTATION = `checkout/${types.CHECKOUT_UPDATE_PAYMENT_DETAILS}`;
const CHECKOUT_UPDATE_SUCCESS_ORDER_DATA_MUTATION = `checkout/${types.CHECKOUT_UPDATE_SUCCESS_ORDER_DATA}`;
const CHECKOUT_SET_USE_SHIPPING_AS_BILLING_MUTATION = `checkout/${types.CHECKOUT_SET_USE_SHIPPING_AS_BILLING}`;
const CHECKOUT_COPY_SHIPPING_TO_BILLING_ADDRESS_MUTATION = `checkout/${types.CHECKOUT_COPY_SHIPPING_TO_BILLING_ADDRESS}`;

const CHECKOUT_USE_SHIPPING_ADDRESS_AS_BILLING_GETTER = `checkout/${CHECKOUT_USE_SHIPPING_ADDRESS_AS_BILLING}`

export {
  useOrderCreation,
  CHECKOUT_UPDATE_PAYMENT_DETAILS_MUTATION,
  CHECKOUT_UPDATE_SHIPPING_DETAILS_MUTATION,
  CHECKOUT_UPDATE_SUCCESS_ORDER_DATA_MUTATION,
  CHECKOUT_SET_USE_SHIPPING_AS_BILLING_MUTATION,
  CHECKOUT_USE_SHIPPING_ADDRESS_AS_BILLING_GETTER,
  CHECKOUT_COPY_SHIPPING_TO_BILLING_ADDRESS_MUTATION,
  ORDER_ERROR_EVENT
}
