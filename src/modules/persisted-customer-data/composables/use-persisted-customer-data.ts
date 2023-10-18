import { Ref, WritableComputedRef, computed, onBeforeMount, onBeforeUnmount } from '@vue/composition-api';

import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import rootStore from '@vue-storefront/core/store';

import { SN_PERSISTED_CUSTOMER_DATA } from '../types/store-name';
import { LAST_USED_CUSTOMER_EMAIL, LAST_USED_CUSTOMER_FIRST_NAME, LAST_USED_CUSTOMER_LAST_NAME } from '../types/getter';
import { SET_LAST_USED_CUSTOMER_EMAIL, SET_LAST_USED_CUSTOMER_FIRST_NAME, SET_LAST_USED_CUSTOMER_LAST_NAME } from '../types/mutation';

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

export function usePersistedFirstName (firstName: Ref<string | undefined> | undefined) {
  function fillLastUsedCustomerFirstName () {
    if (!firstName) {
      return;
    }

    firstName.value = rootStore.getters[`${SN_PERSISTED_CUSTOMER_DATA}/${LAST_USED_CUSTOMER_FIRST_NAME}`];
  }

  function persistLastUsedCustomerFirstName (firstName: string | undefined) {
    rootStore.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_FIRST_NAME}`, firstName);
  }

  onBeforeMount(() => {
    fillLastUsedCustomerFirstName();
    EventBus.$on('user-after-loggedin', fillLastUsedCustomerFirstName);
  });

  onBeforeUnmount(() => {
    EventBus.$off('user-after-loggedin', fillLastUsedCustomerFirstName);
  });

  return {
    persistLastUsedCustomerFirstName
  }
}

export function usePersistedLastName (lastName: Ref<string | undefined> | undefined) {
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

export function usePersistedCustomerData ({
  email,
  firstName,
  lastName
}: {
  email?: Ref<string | undefined>,
  firstName?: Ref<string | undefined>,
  lastName?: Ref<string | undefined>
}) {
  return {
    ...usePersistedEmail(email),
    ...usePersistedFirstName(firstName),
    ...usePersistedLastName(lastName)
  }
}
