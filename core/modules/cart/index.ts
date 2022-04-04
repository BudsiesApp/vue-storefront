import { StorefrontModule } from '@vue-storefront/core/lib/modules'
import { cartStore } from './store'
import { cartCacheHandlerPlugin, totalsCacheHandlerPlugin } from './helpers';
import { isServer } from '@vue-storefront/core/helpers'
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'

import cartClearHandlerFactory from './helpers/cartClearHandler.factory';

export const CartModule: StorefrontModule = function ({ store, router }) {
  StorageManager.init('cart')

  store.registerModule('cart', cartStore)

  if (!isServer) store.dispatch('cart/load')
  store.subscribe(cartCacheHandlerPlugin);
  store.subscribe(totalsCacheHandlerPlugin);
  store.subscribe(cartClearHandlerFactory(router))
}
