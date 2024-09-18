import rootStore from '@vue-storefront/core/store'

import { checkMultiStoreLocalStorageKey } from 'src/modules/shared/helpers/check-multi-store-local-storage-key.function';

import { SET_PRODUCTION_SPOT_COUNTDOWN_EXPIRATION_DATE } from '../types/StoreMutations';

function getItemsFromStorage ({ key }) {
  if (checkMultiStoreLocalStorageKey(key, 'promotionPlatform/production-spot-countdown-expiration-date')) {
    const rawValue = localStorage[key];
    const value = rawValue ? JSON.parse(localStorage[key]) : undefined;

    rootStore.commit(
      `promotionPlatform/${SET_PRODUCTION_SPOT_COUNTDOWN_EXPIRATION_DATE}`,
      {
        value,
        avoidPersistInLocalStorage: true
      }
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
