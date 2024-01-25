import { urlStore } from './store'
import { StorefrontModule } from '@vue-storefront/core/lib/modules'
import { beforeEachGuard } from './router/beforeEach'
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'

export let cacheStorage = StorageManager.init('url')

function createCacheStorage() {
  cacheStorage = StorageManager.init('url');
}

export const UrlModule: StorefrontModule = function ({ store, router }) {
  createCacheStorage()
  store.registerModule('url', urlStore)
  router.beforeEach(beforeEachGuard)
}
