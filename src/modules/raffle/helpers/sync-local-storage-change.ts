import rootStore from '@vue-storefront/core/store'

import { checkMultiStoreLocalStorageKey } from 'src/modules/shared/helpers/check-multistore-local-storage-key.function';

import { SN_RAFFLE } from '../types/store-name';
import { VERIFY_TOKEN } from '../types/action';
import { RAFFLE_TOKEN } from '../types/local-storage-keys';
import { PARTICIPANT_DATA_SET } from '../types/mutation';

function getItemsFromStorage ({ key }: {key: string | null}) {
  if (!key) {
    rootStore.commit(`${SN_RAFFLE}/${PARTICIPANT_DATA_SET}`, undefined);
    return;
  }

  if (checkMultiStoreLocalStorageKey(key, `shop/${SN_RAFFLE}/${RAFFLE_TOKEN}`)) {
    const storedValue = localStorage[key];

    if (!storedValue) {
      rootStore.commit(`${SN_RAFFLE}/${PARTICIPANT_DATA_SET}`, undefined);
      return;
    }

    const value = JSON.parse(localStorage[key]);

    if (!value) {
      rootStore.commit(`${SN_RAFFLE}/${PARTICIPANT_DATA_SET}`, undefined);
      return;
    }

    rootStore.dispatch(`${SN_RAFFLE}/${VERIFY_TOKEN}`, value);
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
