import { Store } from 'vuex'
import i18n from '@vue-storefront/i18n'
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { PAYMENT_ERROR_EVENT } from 'src/modules/shared/types/payment-error-event'

export function requirePaymentTotals (store: Store<any>) {
  const totals = store.getters['cart/getPaymentTotals']
  if (totals) return totals

  EventBus.$emit(PAYMENT_ERROR_EVENT, true)
  store.dispatch('notification/spawnNotification', {
    type: 'warning',
    message: i18n.t('Order totals are unavailable. Refresh totals to continue.'),
    action1: { label: i18n.t('OK') }
  })
  return null
}
