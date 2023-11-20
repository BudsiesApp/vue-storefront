import { Ref, WritableComputedRef, onBeforeMount, onBeforeUnmount } from '@vue/composition-api';

import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import rootStore from '@vue-storefront/core/store';

import { SN_PERSISTED_CUSTOMER_DATA } from '../types/store-name';
import { LAST_USED_CUSTOMER_LAST_NAME } from '../types/getter';
import { SET_LAST_USED_CUSTOMER_LAST_NAME } from '../types/mutation';

export function usePersistedLastName (
  lastName: Ref<string | undefined>
  | WritableComputedRef<string | undefined>
  | undefined
) {
  function fillLastUsedCustomerLastName () {
    if (!lastName) {
      return;
    }

    lastName.value = rootStore.getters[`${SN_PERSISTED_CUSTOMER_DATA}/${LAST_USED_CUSTOMER_LAST_NAME}`];
  }

  function persistLastUsedCustomerLastName (lastName: string | undefined) {
    rootStore.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_LAST_NAME}`, lastName);
  }

  onBeforeMount(() => {
    fillLastUsedCustomerLastName();
    EventBus.$on('user-after-loggedin', fillLastUsedCustomerLastName);
  });

  onBeforeUnmount(() => {
    EventBus.$off('user-after-loggedin', fillLastUsedCustomerLastName);
  });

  return {
    persistLastUsedCustomerLastName
  }
}
