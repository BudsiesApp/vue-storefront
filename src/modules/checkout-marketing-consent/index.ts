import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { isServer } from '@vue-storefront/core/helpers';
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import { consentModule } from './store';
import { STORE_NAME } from './store/store-name';
import { CLEAR_SELECTION, HYDRATE_SELECTION } from './types/store/actions';
import { GET_SELECTION } from './types/store/getters';

const HYDRATE_SELECTION_ACTION = `${STORE_NAME}/${HYDRATE_SELECTION}`;
const CLEAR_SELECTION_ACTION = `${STORE_NAME}/${CLEAR_SELECTION}`;
const SELECTION_GETTER = `${STORE_NAME}/${GET_SELECTION}`;

export const CheckoutMarketingConsentModule: StorefrontModule = ({ store }) => {
  StorageManager.init(STORE_NAME);
  store.registerModule(STORE_NAME, consentModule);

  if (isServer) {
    return;
  }

  store.dispatch(HYDRATE_SELECTION_ACTION);

  const clearSelection = () => store.dispatch(CLEAR_SELECTION_ACTION);

  EventBus.$on('order-after-placed', clearSelection);
  EventBus.$on('user-after-logout', clearSelection);
};

export { SELECTION_GETTER };
export * from './helpers';
export * from './types/marketing-consent';
export { useMarketingConsentSettings } from './composables/use-marketing-consent-settings';
