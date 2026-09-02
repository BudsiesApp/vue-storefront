import Vue from 'vue'
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { isServer, once } from '@vue-storefront/core/helpers'
import { Logger } from '@vue-storefront/core/lib/logger';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';

import { getFeraScript } from './helpers/get-fera-script.function';
import { registerFeraSubmitterEvents } from './helpers/register-fera-submitter-events.function';
import ProductDetailRating from './components/product-detail-rating.vue';
import ProductCollectionRating from './components/product-collection-rating.vue';
import { CAPTURE_SUBMITTED_REVIEW, CLEAR_MEDIA_CONSENT, SHOW_MEDIA_CONSENT } from './store/actions';
import { feraStore } from './store';
import { FERA_MEDIA_CONSENT_MODAL_NAME } from './types/modal-name';
import { FERA_STORE_NAME } from './types/store-name';

export const FeraModule: StorefrontModule = ({ appConfig, services, store }) => {
  const apiPublicKey = (appConfig.fera.apiPublicKey || '').trim();

  if (!apiPublicKey) {
    return;
  }

  store.registerModule(FERA_STORE_NAME, feraStore);

  once('__VUE_EXTEND__FERA__', () => {
    Vue.mixin({
      provide: {
        ProductRatingComponent: ProductDetailRating,
        ProductCollectionRatingComponent: ProductCollectionRating
      }
    });
  })

  services.head.append(getFeraScript(apiPublicKey));

  if (isServer) {
    return;
  }

  registerFeraSubmitterEvents({
    onSubmit: (event) => {
      console.log(event);
      store.dispatch(`${FERA_STORE_NAME}/${CAPTURE_SUBMITTED_REVIEW}`, event)
        .catch((reason) => Logger.error(reason, FERA_STORE_NAME)());
    },
    onHide: () => {
      store.dispatch(`${FERA_STORE_NAME}/${SHOW_MEDIA_CONSENT}`)
        .catch((reason) => Logger.error(reason, FERA_STORE_NAME)());
    }
  });

  EventBus.$on('user-after-logout', () => {
    store.dispatch(`${FERA_STORE_NAME}/${CLEAR_MEDIA_CONSENT}`);
    store.dispatch('ui/closeModal', {
      name: FERA_MEDIA_CONSENT_MODAL_NAME
    });
  });
}
