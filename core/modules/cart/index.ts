import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { StorefrontModule } from '@vue-storefront/core/lib/modules'
import { isServer } from '@vue-storefront/core/helpers'
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'
import { localStorageSynchronizationFactory } from 'src/modules/shared';

import { cartCacheHandlerPlugin, getItemsFromStorage } from './helpers';
import cartClearHandlerFactory from './helpers/cartClearHandler.factory';
import { cartStore } from './store'
import { LOCAL_CART_DATA_LOADED_EVENT } from './types/local-cart-data-loaded.event';

export const CartModule: StorefrontModule = function ({ store, router }) {
  StorageManager.init('cart')
  store.registerModule('cart', cartStore)

  if (!isServer) {
    store.dispatch('cart/load')

    const localStorageSynchronization = localStorageSynchronizationFactory(
      getItemsFromStorage,
      cartCacheHandlerPlugin
    );

    store.subscribe(localStorageSynchronization.setItems);
    store.subscribe(cartClearHandlerFactory(router));

    const onCartNotFoundErrorHandler = () => {
      store.dispatch(
        'clear',
        {
          disconnect: true,
          sync: false
        }
      );
    };

    EventBus.$on('cart-not-found-error', onCartNotFoundErrorHandler);
  }
}

export {
  LOCAL_CART_DATA_LOADED_EVENT
}
