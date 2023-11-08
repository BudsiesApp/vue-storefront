import { ActionContext } from 'vuex';
import { LocalizedRoute } from '@vue-storefront/core/lib/types';
import RootState from '@vue-storefront/core/types/RootState';
import { UrlState } from '@vue-storefront/core/modules/url/types/UrlState';
import { AsyncDataLoader } from '@vue-storefront/core/lib/async-data-loader';
import { isServer } from '@vue-storefront/core/helpers';
import { UrlRewrite } from './store/types/url-rewrite.interface';

export const mappingFallbackForUrlRewrite = async (
  { dispatch, rootGetters }: ActionContext<UrlState, RootState>,
  { url }: { url: string }
): Promise<LocalizedRoute | undefined> => {
  const urlRewriteForRequestPath: UrlRewrite = await dispatch('urlRewrite/loadUrlRewrite', { requestPath: url }, { root: true });

  if (!urlRewriteForRequestPath) {
    return;
  }

  const targetPath = urlRewriteForRequestPath.targetPath;
  const redirectCode = urlRewriteForRequestPath.redirectCode;

  if (!isServer) {
    return {
      name: 'url-rewrite',
      path: `/${url}/`,
      params: {
        targetPath: `/${targetPath}/`
      }
    };
  }

  AsyncDataLoader.push({
    execute: async ({ context }) => {
      if (context) {
        context.server.response.redirect(redirectCode, '/' + targetPath);
      }
    }
  })
}
