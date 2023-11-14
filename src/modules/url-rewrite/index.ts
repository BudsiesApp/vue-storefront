import { StorefrontModule } from '@vue-storefront/core/lib/modules';

import { getUrlRewriteRouteData } from './helpers/get-url-rewrite-route-data.function';
import { urlRewriteStore } from './store'

export const UrlRewriteModule: StorefrontModule = function ({ store }) {
  store.registerModule('urlRewrite', urlRewriteStore);
}

export {
  getUrlRewriteRouteData
}
