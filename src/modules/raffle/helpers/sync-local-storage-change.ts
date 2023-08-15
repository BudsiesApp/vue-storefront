import rootStore from '@vue-storefront/core/store'

import { checkMultiStoreLocalStorageKey } from 'src/modules/shared/helpers/check-multi-store-local-storage-key.function';

import { SN_RAFFLE } from '../types/store-name';
import { VERIFY_TOKEN } from '../types/action';
import { RAFFLE_TOKEN, REFERRER_TOKEN } from '../types/local-storage-keys';
import { PARTICIPANT_DATA_SET, REFERRER_TOKEN_SET } from '../types/mutation';

const clearParticipantData = () => {
  rootStore.commit(`${SN_RAFFLE}/${PARTICIPANT_DATA_SET}`, undefined);
}
const clearReferrerToken = () => {
  rootStore.commit(`${SN_RAFFLE}/${REFERRER_TOKEN_SET}`, undefined);
}

function getItemsFromStorage ({ key }: {key: string | null}) {
  if (!key) {
    clearParticipantData();
    clearReferrerToken();
    return;
  }

  const isRaffleTokenChanged = checkMultiStoreLocalStorageKey(key, `${SN_RAFFLE}/${RAFFLE_TOKEN}`);
  const isReferrerTokenChanged = checkMultiStoreLocalStorageKey(key, `${SN_RAFFLE}/${REFERRER_TOKEN}`);

  if (!isRaffleTokenChanged && !isReferrerTokenChanged) {
    return;
  }

  const clearData = () => {
    if (isRaffleTokenChanged) {
      clearParticipantData();
    }

    if (isReferrerTokenChanged) {
      clearReferrerToken();
    }
  }

  const rawValue = localStorage[key];

  if (!rawValue) {
    clearData();
    return;
  }

  const value = JSON.parse(localStorage[key]);

  if (!value) {
    clearData();
    return;
  }

  if (isRaffleTokenChanged) {
    rootStore.dispatch(`${SN_RAFFLE}/${VERIFY_TOKEN}`, value);
  }

  if (isReferrerTokenChanged) {
    rootStore.commit(`${SN_RAFFLE}/${REFERRER_TOKEN_SET}`, value);
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
