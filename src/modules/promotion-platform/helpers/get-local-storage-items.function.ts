import rootStore from '@vue-storefront/core/store'

import { parseLocalStorageValue } from 'src/modules/shared';
import { checkMultiStoreLocalStorageKey } from 'src/modules/shared/helpers/check-multi-store-local-storage-key.function';

import { SET_PRODUCTION_SPOT_COUNTDOWN_EXPIRATION_DATE } from '../types/StoreMutations';

export function getItemsFromStorage ({ key }) {
  if (checkMultiStoreLocalStorageKey(key, 'promotionPlatform/production-spot-countdown-expiration-date')) {
    const value = parseLocalStorageValue(localStorage[key]);

    rootStore.commit(
      `promotionPlatform/${SET_PRODUCTION_SPOT_COUNTDOWN_EXPIRATION_DATE}`,
      value
    );
  }
}
