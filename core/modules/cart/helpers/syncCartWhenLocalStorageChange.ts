import rootStore from '@vue-storefront/core/store'

import { checkMultiStoreLocalStorageKey } from 'src/modules/shared/helpers/check-multi-store-local-storage-key.function';

import { CART_LOAD_CART_SERVER_TOKEN, CART_SET_ITEMS_HASH } from '../store/mutation-types';

function getItemsFromStorage ({ key }) {
  const valueFromStorage = localStorage[key] ? JSON.parse(localStorage[key]) : undefined;

  if (checkMultiStoreLocalStorageKey(key, 'cart/current-cart')) {
    rootStore.dispatch('cart/updateCart', { items: valueFromStorage })
  } else if (checkMultiStoreLocalStorageKey(key, 'cart/current-totals')) {
    rootStore.dispatch('cart/updateTotals', valueFromStorage)
  } else if (checkMultiStoreLocalStorageKey(key, 'cart/current-cart-token')) {
    rootStore.commit(`cart/${CART_LOAD_CART_SERVER_TOKEN}`, valueFromStorage);
  } else if (checkMultiStoreLocalStorageKey(key, 'cart/current-cart-hash')) {
    rootStore.commit(`cart/${CART_SET_ITEMS_HASH}`, valueFromStorage);
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
