import { Ref, WritableComputedRef, onBeforeMount } from '@vue/composition-api';

import rootStore from '@vue-storefront/core/store';

import { LAST_USED_CUSTOMER_PHONE_NUMBER } from '../types/getter';
import { SET_LAST_USED_CUSTOMER_PHONE_NUMBER } from '../types/mutation';
import { SN_PERSISTED_CUSTOMER_DATA } from '../types/store-name';

export function usePersistedPhoneNumber (
  phoneNumber: Ref<string | undefined>
  | WritableComputedRef<string | undefined>
  | undefined
) {
  function fillLastUsedCustomerPhoneNumber () {
    if (!phoneNumber) {
      return;
    }

    phoneNumber.value = rootStore.getters[`${SN_PERSISTED_CUSTOMER_DATA}/${LAST_USED_CUSTOMER_PHONE_NUMBER}`];
  }

  function persistLastUsedCustomerPhoneNumber (phoneNumber: string | undefined) {
    rootStore.commit(
      `${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_PHONE_NUMBER}`,
      {
        value: phoneNumber
      }
    );
  }

  onBeforeMount(() => {
    fillLastUsedCustomerPhoneNumber();
  });

  return {
    persistLastUsedCustomerPhoneNumber
  }
}
