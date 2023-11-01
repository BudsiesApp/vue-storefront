import rootStore from '@vue-storefront/core/store'

import { checkMultiStoreLocalStorageKey } from 'src/modules/shared/helpers/check-multi-store-local-storage-key.function';
import { SN_PERSISTED_CUSTOMER_DATA } from '../types/store-name';
import { SET_LAST_USED_CUSTOMER_EMAIL, SET_LAST_USED_CUSTOMER_FIRST_NAME, SET_LAST_USED_CUSTOMER_LAST_NAME, SET_LAST_USED_CUSTOMER_PHONE_NUMBER, SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY } from '../types/mutation';
import { EMAIL, FIRST_NAME, LAST_NAME, PHONE_NUMBER, SHIPPING_COUNTRY } from '../types/local-storage-key';

const clearLastUsedCustomerEmail = () => {
  rootStore.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_EMAIL}`, undefined);
}
const clearLastUsedCustomerFirstName = () => {
  rootStore.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_FIRST_NAME}`, undefined);
}
const clearLastUsedCustomerLastName = () => {
  rootStore.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_LAST_NAME}`, undefined);
}
const clearLastUsedCustomerPhoneNumber = () => {
  rootStore.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_PHONE_NUMBER}`, undefined);
}
const clearLastUsedCustomerShippingCountry = () => {
  rootStore.commit(`${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY}`, undefined);
}

function getItemsFromStorage ({ key }: {key: string | null}) {
  if (!key) {
    clearLastUsedCustomerEmail();
    clearLastUsedCustomerFirstName();
    clearLastUsedCustomerLastName();
    clearLastUsedCustomerPhoneNumber();
    clearLastUsedCustomerShippingCountry();
    return;
  }

  const isEmailChanged = checkMultiStoreLocalStorageKey(
    key,
    `${SN_PERSISTED_CUSTOMER_DATA}/${EMAIL}`
  );
  const isFirstNameChanged = checkMultiStoreLocalStorageKey(
    key,
    `${SN_PERSISTED_CUSTOMER_DATA}/${FIRST_NAME}`
  );
  const isLastNameChanged = checkMultiStoreLocalStorageKey(
    key,
    `${SN_PERSISTED_CUSTOMER_DATA}/${LAST_NAME}`
  );
  const isPhoneNumberChanged = checkMultiStoreLocalStorageKey(
    key,
    `${SN_PERSISTED_CUSTOMER_DATA}/${PHONE_NUMBER}`
  );
  const isCountryChanged = checkMultiStoreLocalStorageKey(
    key,
    `${SN_PERSISTED_CUSTOMER_DATA}/${SHIPPING_COUNTRY}`
  );

  if (
    !isEmailChanged &&
    !isFirstNameChanged &&
    !isLastNameChanged &&
    !isPhoneNumberChanged &&
    !isCountryChanged
  ) {
    return;
  }

  const clearData = () => {
    if (isEmailChanged) {
      clearLastUsedCustomerEmail();
    }

    if (isFirstNameChanged) {
      clearLastUsedCustomerFirstName();
    }

    if (isLastNameChanged) {
      clearLastUsedCustomerLastName();
    }

    if (isPhoneNumberChanged) {
      clearLastUsedCustomerPhoneNumber();
    }

    if (isCountryChanged) {
      clearLastUsedCustomerShippingCountry();
    }
  }

  const rawValue = localStorage[key];

  if (!rawValue) {
    clearData();
    return;
  }

  const value = JSON.parse(rawValue);

  if (!value) {
    clearData();
    return;
  }

  if (isEmailChanged) {
    rootStore.dispatch(
      `${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_EMAIL}`,
      value
    );
  }

  if (isFirstNameChanged) {
    rootStore.commit(
      `${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_FIRST_NAME}`,
      value
    );
  }

  if (isLastNameChanged) {
    rootStore.commit(
      `${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_LAST_NAME}`,
      value
    );
  }

  if (isPhoneNumberChanged) {
    rootStore.commit(
      `${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_PHONE_NUMBER}`,
      value
    );
  }

  if (isCountryChanged) {
    rootStore.commit(
      `${SN_PERSISTED_CUSTOMER_DATA}/${SET_LAST_USED_CUSTOMER_SHIPPING_COUNTRY}`,
      value
    );
  }
}

function addEventListener () {
  window.addEventListener('storage', getItemsFromStorage)
}

function removeEventListener () {
  window.removeEventListener('storage', getItemsFromStorage)
}

export {
  addEventListener,
  removeEventListener
}
