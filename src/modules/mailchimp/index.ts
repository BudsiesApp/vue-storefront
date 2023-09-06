import { isServer } from '@vue-storefront/core/helpers';
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import { orderHooks } from '@vue-storefront/core/modules/order/hooks';

import { cacheHandlerFactory } from './helpers/cache-handler.factory';
import * as syncLocalStorageChange from './helpers/sync-local-storage-change';
import { mailchimpStore } from './store';
import { SYNCHRONIZE } from './types/action';
import { GET_CAMPAIGN_ID, GET_LANDING_PAGE } from './types/getter';
import { SN_MAILCHIMP } from './types/store-name';

export const MailchimpModule: StorefrontModule = function ({ store, router }) {
  store.registerModule(SN_MAILCHIMP, mailchimpStore);

  if (isServer) {
    return;
  }

  StorageManager.init(SN_MAILCHIMP);
  store.dispatch(`${SN_MAILCHIMP}/${SYNCHRONIZE}`, router);
  store.subscribe(cacheHandlerFactory());
  syncLocalStorageChange.addEventListener();

  orderHooks.beforePlaceOrder((order) => {
    const campaignId = store.getters[`${SN_MAILCHIMP}/${GET_CAMPAIGN_ID}`];
    const landingPage = store.getters[`${SN_MAILCHIMP}/${GET_LANDING_PAGE}`];

    if (!campaignId) {
      return order;
    }

    order.mailchimp_campaign_id = campaignId;
    order.mailchimp_landing_page = landingPage;

    return order;
  });
}
