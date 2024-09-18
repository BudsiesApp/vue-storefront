import { MutationPayload } from 'vuex';

import { StorageManager } from '@vue-storefront/core/lib/storage-manager'

import * as types from '../types/mutation';
import { SN_MAILCHIMP } from '../types/store-name';
import { CAMPAIGN_ID, LANDING_PAGE } from '../types/local-storage-key';

export function cacheHandlerFactory () {
  return (mutation: MutationPayload) => {
    if (mutation.payload?.avoidPersistInLocalStorage) {
      return;
    }

    const type = mutation.type;
    const mailchimpStorage = StorageManager.get(SN_MAILCHIMP);

    if (type.endsWith(types.SET_CAMPAIGN_ID)) {
      if (!mutation.payload?.value) {
        mailchimpStorage.removeItem(CAMPAIGN_ID);
        return;
      }

      mailchimpStorage.setItem(CAMPAIGN_ID, mutation.payload.value);
    }

    if (type.endsWith(types.SET_LANDING_PAGE)) {
      if (!mutation.payload?.value) {
        mailchimpStorage.removeItem(LANDING_PAGE);
        return;
      }

      mailchimpStorage.setItem(LANDING_PAGE, mutation.payload.value);
    }
  }
}
