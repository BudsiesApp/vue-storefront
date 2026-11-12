import Vue from 'vue';
import { ActionContext } from 'vuex';
import queryString from 'query-string';

import { LocalizedRoute } from '@vue-storefront/core/lib/types';
import RootState from '@vue-storefront/core/types/RootState';
import { UrlState } from '@vue-storefront/core/modules/url/types/UrlState';

import { getUrlRewriteRouteData } from './helpers/get-url-rewrite-route-data.function';
import { UrlRewrite } from './store/types/url-rewrite.interface';

export const mappingFallbackForUrlRewrite = async (
  { dispatch }: ActionContext<UrlState, RootState>,
  {
    url,
    params,
    redirect
  }: {
    url: string,
    params: queryString.ParsedQuery<string>,
    redirect?: (path: string, statusCode?: number) => void
  }
): Promise<LocalizedRoute | undefined> => {
  if (Vue.prototype.$cacheTags) {
    Vue.prototype.$cacheTags.add(`url_rewrite`);
    Vue.prototype.$cacheTags.add(`url_rewrite_${url.split('?')[0].replace(/^\/+|\/+$/g, '').toLowerCase()}`);
  }

  const urlRewriteForRequestPath: UrlRewrite = await dispatch('urlRewrite/loadUrlRewrite', { requestPath: url }, { root: true });

  if (!urlRewriteForRequestPath) {
    return;
  }

  const targetPath = urlRewriteForRequestPath.targetPath;
  const redirectCode = urlRewriteForRequestPath.redirectCode;

  if (!redirect) {
    return getUrlRewriteRouteData(
      url,
      targetPath,
      queryString.stringify(params)
    );
  }

  let query = queryString.stringify(params);

  if (query) {
    query = `?${query}`;
  }

  const ssrRedirectFullPath = `/${targetPath}/${query}`;

  redirect(ssrRedirectFullPath, redirectCode);
}
