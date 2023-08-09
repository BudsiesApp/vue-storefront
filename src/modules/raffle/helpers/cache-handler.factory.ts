import { MutationPayload } from 'vuex';

import RootState from '@vue-storefront/core/types/RootState';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'

import * as types from '../types/mutation';
import { SN_RAFFLE } from '../types/store-name';

export function cacheHandlerFactory () {
  return (mutation: MutationPayload, state: RootState) => {
    const type = mutation.type;
    const raffleStorage = StorageManager.get(SN_RAFFLE);

    if (type.endsWith(types.PARTICIPANT_DATA_SET)) {
      if (!mutation.payload) {
        raffleStorage.removeItem('raffle-token');
        return;
      }

      raffleStorage.setItem('raffle-token', mutation.payload.token);
    }

    if (type.endsWith(types.REFERRER_TOKEN_SET)) {
      raffleStorage.setItem('referrer-token', mutation.payload);
    }
  }
}
