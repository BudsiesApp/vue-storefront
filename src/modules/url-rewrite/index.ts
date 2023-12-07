import { StorefrontModule } from '@vue-storefront/core/lib/modules';

import { urlRewriteStore } from './store'
import { mappingFallbackForUrlRewrite } from './mappingFallback';

export const UrlRewriteModule: StorefrontModule = function ({ store }) {
  store.registerModule('urlRewrite', urlRewriteStore);
}

export {
  mappingFallbackForUrlRewrite
}
