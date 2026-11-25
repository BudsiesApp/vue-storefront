import { ActionTree } from 'vuex';
import config from 'config';
import { TaskQueue } from '@vue-storefront/core/lib/sync';
import { isServer, processURLAddress } from '@vue-storefront/core/helpers';
import { Logger } from '@vue-storefront/core/lib/logger';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import RootState from '@vue-storefront/core/types/RootState';

import { ConsentSelection, MarketingSubscriptionRequest } from '../types/marketing-consent';
import { CLEAR_SELECTION, HYDRATE_SELECTION, SAVE_SELECTION, SUBMIT_SUBSCRIPTION } from '../types/store/actions';
import { SET_HYDRATED, SET_SELECTION } from '../types/store/mutations';
import { ConsentState } from '../types/store/state';
import { SELECTION_STORAGE_KEY, STORE_NAME } from './store-name';

function reportStorageError (error: unknown): void {
  Logger.error(error, 'checkout-marketing-consent')();
}

// The in-memory selection is authoritative; a slow or failing storage write must not block the checkout.
function persistSelection (selection: ConsentSelection | null): void {
  const storage = StorageManager.get(STORE_NAME);
  const write = selection
    ? storage.setItem(SELECTION_STORAGE_KEY, selection)
    : storage.removeItem(SELECTION_STORAGE_KEY);

  Promise.resolve(write).catch(reportStorageError);
}

export const actions: ActionTree<ConsentState, RootState> = {
  async [SUBMIT_SUBSCRIPTION] (_, payload: MarketingSubscriptionRequest) {
    const { result, resultCode } = await TaskQueue.execute({
      url: processURLAddress(`${config.budsies.endpoint}/marketing-subscription-requests`),
      payload: {
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        mode: 'cors', method: 'POST', body: JSON.stringify(payload)
      },
      silent: false
    });
    if (resultCode !== 200) throw Error('Error while submitting marketing subscription ' + result);
    return result;
  },
  async [HYDRATE_SELECTION] ({ commit }): Promise<void> {
    const selection = await StorageManager.get(STORE_NAME).getItem(SELECTION_STORAGE_KEY);

    commit(SET_SELECTION, selection);
    commit(SET_HYDRATED);
  },
  [SAVE_SELECTION] ({ commit }, selection: ConsentSelection): void {
    commit(SET_SELECTION, selection);

    if (isServer) {
      return;
    }

    persistSelection(selection);
  },
  [CLEAR_SELECTION] ({ commit }): void {
    commit(SET_SELECTION, null);

    if (isServer) {
      return;
    }

    persistSelection(null);
  }
};
