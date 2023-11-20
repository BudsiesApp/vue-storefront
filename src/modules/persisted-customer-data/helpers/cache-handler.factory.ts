import { MutationPayload } from 'vuex';

import { StorageManager } from '@vue-storefront/core/lib/storage-manager'

import * as types from '../types/mutation';
import { SN_PERSISTED_CUSTOMER_DATA } from '../types/store-name';
import { EMAIL, FIRST_NAME, LAST_NAME, PHONE_NUMBER, SHIPPING_COUNTRY } from '../types/local-storage-key';

export function cacheHandlerFactory () {
  return (mutation: MutationPayload) => {
    const type = mutation.type;
    const persistedCustomerDataStorage = StorageManager.get(SN_PERSISTED_CUSTOMER_DATA);

    if (type.endsWith(types.SET_LAST_USED_CUSTOMER_EMAIL)) {
      if (!mutation.payload) {
        persistedCustomerDataStorage.removeItem(EMAIL);
        return;
      }

      persistedCustomerDataStorage.setItem(EMAIL, mutation.payload);
    }

    if (type.endsWith(types.SET_LAST_USED_CUSTOMER_FIRST_NAME)) {
      if (!mutation.payload) {
        persistedCustomerDataStorage.removeItem(FIRST_NAME);
        return;
      }

      persistedCustomerDataStorage.setItem(FIRST_NAME, mutation.payload);
    }

    if (type.endsWith(types.SET_LAST_USED_CUSTOMER_LAST_NAME)) {
      if (!mutation.payload) {
        persistedCustomerDataStorage.removeItem(LAST_NAME);
        return;
      }

      persistedCustomerDataStorage.setItem(LAST_NAME, mutation.payload);
    }

    if (type.endsWith(types.SET_LAST_USED_CUSTOMER_PHONE_NUMBER)) {
      if (!mutation.payload) {
        persistedCustomerDataStorage.removeItem(PHONE_NUMBER);
        return;
      }

      persistedCustomerDataStorage.setItem(PHONE_NUMBER, mutation.payload);
    }

    if (type.endsWith(types.SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY)) {
      if (!mutation.payload) {
        persistedCustomerDataStorage.removeItem(SHIPPING_COUNTRY);
        return;
      }

      persistedCustomerDataStorage.setItem(SHIPPING_COUNTRY, mutation.payload);
    }
  }
}
