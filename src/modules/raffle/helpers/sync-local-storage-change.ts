import rootStore from '@vue-storefront/core/store'

import { checkMultiStoreLocalStorageKey } from 'src/modules/shared/helpers/check-multistore-local-storage-key.function';

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

  const isRaffleTokenChanged = checkMultiStoreLocalStorageKey(key, `shop/${SN_RAFFLE}/${RAFFLE_TOKEN}`);
  const isReferrerTokenChanged = checkMultiStoreLocalStorageKey(key, `shop/${SN_RAFFLE}/${REFERRER_TOKEN}`);

  if (!isRaffleTokenChanged && !isReferrerTokenChanged) {
    return;
  }

  const clearDataFunction = isRaffleTokenChanged ? clearParticipantData : clearReferrerToken;

  const storedValue = localStorage[key];

  if (!storedValue) {
    clearDataFunction();
    return;
  }

  const value = JSON.parse(localStorage[key]);

  if (!value) {
    clearDataFunction();
    return;
  }

  if (isRaffleTokenChanged) {
    rootStore.dispatch(`${SN_RAFFLE}/${VERIFY_TOKEN}`, value);
    return;
  }

  rootStore.commit(`${SN_RAFFLE}/${REFERRER_TOKEN_SET}`, value);
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
