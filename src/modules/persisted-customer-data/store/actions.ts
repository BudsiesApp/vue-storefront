import { ActionTree } from 'vuex';

import RootState from '@vue-storefront/core/types/RootState';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import { Logger } from '@vue-storefront/core/lib/logger';

import { SN_BUDSIES } from 'src/modules/budsies/store/mutation-types';

import { StoreState } from '../types/store-state.interface';
import { SN_PERSISTED_CUSTOMER_DATA } from '../types/store-name';
import { EMAIL, FIRST_NAME, LAST_NAME, PHONE_NUMBER, SHIPPING_COUNTRY, VAT_ID } from '../types/local-storage-key';
import { SET_PERSISTED_CUSTOMER_EMAIL, SET_PERSISTED_CUSTOMER_FIRST_NAME, SET_PERSISTED_CUSTOMER_LAST_NAME, SET_PERSISTED_CUSTOMER_PHONE_NUMBER, SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY, SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, SET_PERSISTED_CUSTOMER_VAT_ID } from '../types/mutation';

export const actions: ActionTree<StoreState, RootState> = {
  async synchronize ({ commit }): Promise<void> {
    let persistedCustomerDataStorage: ReturnType<typeof StorageManager.get>;
    try {
      persistedCustomerDataStorage = StorageManager.get(SN_PERSISTED_CUSTOMER_DATA);
    } catch (error) {
      commit(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, true);
      Logger.error(error)();
      return;
    }

    const shippingCountry = await new Promise<string | null>((resolve) => {
      try {
        const result = persistedCustomerDataStorage.getItem(SHIPPING_COUNTRY, (error, value) => {
          if (error) Logger.error('Unable to read saved shipping country')();
          resolve(error ? null : value);
        });
        result.then(resolve, () => {
          Logger.error('Unable to read saved shipping country')();
          resolve(null);
        });
      } catch (error) {
        Logger.error('Unable to read saved shipping country')();
        resolve(null);
      }
    });
    if (shippingCountry) {
      commit(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY, shippingCountry);
    }
    commit(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, true);

    let email = await persistedCustomerDataStorage.getItem(EMAIL);
    const firstName = await persistedCustomerDataStorage.getItem(FIRST_NAME);
    const lastName = await persistedCustomerDataStorage.getItem(LAST_NAME);
    const phoneNumber = await persistedCustomerDataStorage.getItem(PHONE_NUMBER);
    const vatId = await persistedCustomerDataStorage.getItem(VAT_ID);

    // Backwards compatibility for previous used local storage key
    if (!email) {
      const budsiesStorage = StorageManager.get(SN_BUDSIES);
      email = await budsiesStorage.getItem('customer-email');
    }

    if (email) {
      commit(SET_PERSISTED_CUSTOMER_EMAIL, email);
    }

    if (firstName) {
      commit(SET_PERSISTED_CUSTOMER_FIRST_NAME, firstName);
    }

    if (lastName) {
      commit(SET_PERSISTED_CUSTOMER_LAST_NAME, lastName);
    }

    if (phoneNumber) {
      commit(SET_PERSISTED_CUSTOMER_PHONE_NUMBER, phoneNumber);
    }

    if (vatId) {
      commit(SET_PERSISTED_CUSTOMER_VAT_ID, vatId);
    }
  }
}
