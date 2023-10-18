import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { isServer } from '@vue-storefront/core/helpers';
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import { usePersistedEmail, usePersistedFirstName, usePersistedLastName } from './composables/use-persisted-customer-data';
import { usePersistedPhoneNumber } from './composables/use-persisted-customer-phone-number';
import { LAST_USED_CUSTOMER_EMAIL, LAST_USED_CUSTOMER_FIRST_NAME, LAST_USED_CUSTOMER_LAST_NAME, LAST_USED_CUSTOMER_PHONE_NUMBER, LAST_USED_CUSTOMER_SHIPPING_COUNTRY } from './types/getter';
import { SET_LAST_USED_CUSTOMER_EMAIL, SET_LAST_USED_CUSTOMER_FIRST_NAME, SET_LAST_USED_CUSTOMER_LAST_NAME, SET_LAST_USED_CUSTOMER_PHONE_NUMBER, SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY } from './types/mutation';
import { SN_PERSISTED_CUSTOMER_DATA } from './types/store-name';
import { persistedCustomerDataStore } from './store';
import { addEventListener } from './helpers/sync-local-storage-change';
import { cacheHandlerFactory } from './helpers/cache-handler.factory';

export const PersistedCustomerDataModule: StorefrontModule = async function ({ store }) {
  StorageManager.init(SN_PERSISTED_CUSTOMER_DATA);
  store.registerModule(SN_PERSISTED_CUSTOMER_DATA, persistedCustomerDataStore)

  if (isServer) {
    return;
  }

  store.subscribe(cacheHandlerFactory());
  addEventListener();

  store.dispatch(`${SN_PERSISTED_CUSTOMER_DATA}/synchronize`);
  EventBus.$on('user-after-logout', () => {
    store.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_EMAIL}`, undefined);
    store.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_FIRST_NAME}`, undefined);
    store.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_LAST_NAME}`, undefined);
    store.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_PHONE_NUMBER}`, undefined);
    store.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY}`, undefined);
  })
}

export {
  SN_PERSISTED_CUSTOMER_DATA,
  LAST_USED_CUSTOMER_EMAIL,
  LAST_USED_CUSTOMER_FIRST_NAME,
  LAST_USED_CUSTOMER_LAST_NAME,
  LAST_USED_CUSTOMER_PHONE_NUMBER,
  LAST_USED_CUSTOMER_SHIPPING_COUNTRY,
  SET_LAST_USED_CUSTOMER_EMAIL,
  SET_LAST_USED_CUSTOMER_FIRST_NAME,
  SET_LAST_USED_CUSTOMER_LAST_NAME,
  SET_LAST_USED_CUSTOMER_PHONE_NUMBER,
  SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY,
  usePersistedEmail,
  usePersistedFirstName,
  usePersistedLastName,
  usePersistedPhoneNumber
}
