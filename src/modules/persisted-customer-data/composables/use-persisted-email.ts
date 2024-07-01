import { Ref, WritableComputedRef, computed, onBeforeMount, onBeforeUnmount, onMounted, nextTick } from '@vue/composition-api';

import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import rootStore from '@vue-storefront/core/store';

import { SN_PERSISTED_CUSTOMER_DATA } from '../types/store-name';
import { LAST_USED_CUSTOMER_EMAIL } from '../types/getter';
import { SET_LAST_USED_CUSTOMER_EMAIL } from '../types/mutation';

export function usePersistedEmail (
  email: Ref<string | undefined>
  | WritableComputedRef<string | undefined>
  | undefined
) {
  function fillLastUsedCustomerEmail (force = true) {
    if (!email) {
      return;
    }

    if (email.value && !force) {
      return;
    }

    email.value = rootStore.getters[`${SN_PERSISTED_CUSTOMER_DATA}/${LAST_USED_CUSTOMER_EMAIL}`];
  }

  function persistLastUsedCustomerEmail (email: string | undefined) {
    rootStore.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_EMAIL}`, email);
  }

  onBeforeMount(() => {
    fillLastUsedCustomerEmail(false);
    EventBus.$on('user-after-loggedin', fillLastUsedCustomerEmail);
  });

  onBeforeUnmount(() => {
    EventBus.$off('user-after-loggedin', fillLastUsedCustomerEmail);
  });

  const hasPrefilledEmail = computed(() => {
    return !!rootStore.getters[`${SN_PERSISTED_CUSTOMER_DATA}/${LAST_USED_CUSTOMER_EMAIL}`];
  })

  return {
    persistLastUsedCustomerEmail,
    hasPrefilledEmail
  }
}
