import { ActionContext } from 'vuex';
import queryString from 'query-string';

import { LocalizedRoute } from '@vue-storefront/core/lib/types';
import RootState from '@vue-storefront/core/types/RootState';
import { UrlState } from '@vue-storefront/core/modules/url/types/UrlState';
import { AsyncDataLoader } from '@vue-storefront/core/lib/async-data-loader';
import { isServer } from '@vue-storefront/core/helpers';

import { getUrlRewriteRouteData } from './helpers/get-url-rewrite-route-data.function';
import { UrlRewrite } from './store/types/url-rewrite.interface';

export const mappingFallbackForUrlRewrite = async (
  { dispatch, rootGetters }: ActionContext<UrlState, RootState>,
  { url, params }: { url: string, params: queryString.ParsedQuery<string> }
): Promise<LocalizedRoute | undefined> => {
  const urlRewriteForRequestPath: UrlRewrite = await dispatch('urlRewrite/loadUrlRewrite', { requestPath: url }, { root: true });

  if (!urlRewriteForRequestPath) {
    return;
  }

  const targetPath = urlRewriteForRequestPath.targetPath;
  const redirectCode = urlRewriteForRequestPath.redirectCode;

  if (!isServer) {
    return getUrlRewriteRouteData(
      url,
      targetPath,
      queryString.stringify(params)
    );
  }

  AsyncDataLoader.push({
    execute: async ({ context }) => {
      let query = queryString.stringify(params);

      if (query) {
        query = `?${query}`;
      }

      if (context) {
        context.server.response.redirect(
          redirectCode,
          `/${targetPath}/${query}`
        );
      }
    }
  })
}
