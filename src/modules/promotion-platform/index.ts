import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { CART_ADD_ITEM } from '@vue-storefront/core/modules/cart/store/mutation-types';

import { cacheHandlerFactory } from './helpers/cacheHandler.factory';
import initEventBusListeners from './helpers/initEventBusListeners';
import { getItemsFromStorage } from './helpers/get-local-storage-items.function';
import { module } from './store';
import { CLEAR_PRODUCTION_SPOT_COUNTDOWN_EXPIRATION_DATE, SN_PROMOTION_PLATFORM } from './types/StoreMutations';
import isCustomProduct from '../shared/helpers/is-custom-product.function';
import onWindowMouseLeaveEventHandler from './helpers/on-window-mouseleave-event-handler.function';
import { CAMPAIGN_CONTENT_CHANGED } from './types/campaign-content-changed.event';
import CampaignsGetAPIResponse from './types/CampaignsGetAPIResponse';
import { USER_LEAVING_WEBSITE } from './types/user-leaving-website.event';
import { localStorageSynchronizationFactory } from '../shared';
import { PRODUCT_SET_DISCOUNTS } from '@vue-storefront/core/modules/catalog/store/product/mutation-types';
import { computed } from '@vue/composition-api';

export const PromotionPlatformModule: StorefrontModule = function ({ app, store }) {
  StorageManager.init(SN_PROMOTION_PLATFORM);
  store.registerModule(`${SN_PROMOTION_PLATFORM}`, module);

  if (!app.$isServer) {
    EventBus.$once('session-after-started', async (userToken: string) => {
      initEventBusListeners(store, app);

      store.commit(
        `product/${PRODUCT_SET_DISCOUNTS}`,
        computed(() => store.getters[`${SN_PROMOTION_PLATFORM}/productDiscount`])
      );

      await store.dispatch(`${SN_PROMOTION_PLATFORM}/synchronize`);
      const cartId = store.getters['cart/getCartToken'];

      const updateActiveCampaign = () => {
        return store.dispatch(
          `${SN_PROMOTION_PLATFORM}/updateActiveCampaign`,
          {
            dataParam: app.$route.query.data,
            cartId
          }
        );
      }

      if (!userToken || !cartId || app.$route.query.data) {
        return updateActiveCampaign();
      }

      const response: CampaignsGetAPIResponse = await store.dispatch(
        `${SN_PROMOTION_PLATFORM}/fetchActiveCampaign`,
        {
          cartId,
          userToken
        }
      );

      if (!response.campaignContent.isEmpty) {
        return;
      }

      return updateActiveCampaign();
    });

    EventBus.$on(
      'user-after-logged-in',
      (userToken: string) => {
        const cartId = store.getters['cart/getCartToken'];

        store.dispatch(`${SN_PROMOTION_PLATFORM}/fetchActiveCampaign`, {
          userToken,
          cartId
        });
      }
    );

    store.subscribe((mutation) => {
      if (mutation.type === `cart/${CART_ADD_ITEM}`) {
        if (!isCustomProduct(mutation.payload.product.id)) {
          return;
        }

        const expirationDate = store.getters[`${SN_PROMOTION_PLATFORM}/productionSpotCountdownExpirationDate`];
        if (!expirationDate || expirationDate < Date.now()) {
          return;
        }

        store.commit(`${SN_PROMOTION_PLATFORM}/${CLEAR_PRODUCTION_SPOT_COUNTDOWN_EXPIRATION_DATE}`);
      }
    });

    const localStorageSynchronization = localStorageSynchronizationFactory(
      getItemsFromStorage,
      cacheHandlerFactory()
    );

    store.subscribe(localStorageSynchronization.setItems);

    document.body.addEventListener('mouseleave', onWindowMouseLeaveEventHandler);
  }
}

export {
  CAMPAIGN_CONTENT_CHANGED,
  USER_LEAVING_WEBSITE
}
