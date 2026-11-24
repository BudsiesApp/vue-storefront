import { ActionTree } from 'vuex';

import { isServer } from '@vue-storefront/core/helpers';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import RootState from '@vue-storefront/core/types/RootState';

import { ConsentSelection } from '../types/marketing-consent';
import { CLEAR_SELECTION, HYDRATE_SELECTION, SAVE_SELECTION } from '../types/store/actions';
import { SET_HYDRATED, SET_SELECTION } from '../types/store/mutations';
import { ConsentState } from '../types/store/state';
import { SELECTION_STORAGE_KEY, STORE_NAME } from './store-name';

export const actions: ActionTree<ConsentState, RootState> = {
  async [HYDRATE_SELECTION] ({ commit }): Promise<void> {
    const selection = await StorageManager.get(STORE_NAME).getItem(SELECTION_STORAGE_KEY);

    commit(SET_SELECTION, selection);
    commit(SET_HYDRATED);
  },
  async [SAVE_SELECTION] ({ commit }, selection: ConsentSelection): Promise<void> {
    commit(SET_SELECTION, selection);

    if (isServer) {
      return;
    }

    await StorageManager.get(STORE_NAME).setItem(SELECTION_STORAGE_KEY, selection);
  },
  async [CLEAR_SELECTION] ({ commit }): Promise<void> {
    commit(SET_SELECTION, null);

    if (isServer) {
      return;
    }

    await StorageManager.get(STORE_NAME).removeItem(SELECTION_STORAGE_KEY);
  }
};
