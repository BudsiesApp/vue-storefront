import { ActionTree } from 'vuex'
import config from 'config'
import RootState from '@vue-storefront/core/types/RootState'
import { TaskQueue } from '@vue-storefront/core/lib/sync'
import { processURLAddress } from '@vue-storefront/core/helpers'
import { UrlRewrite } from './types/url-rewrite.interface'
import { UrlRewriteApiResponse } from './types/url-rewrite-api-response.interface'

export const actions: ActionTree<{}, RootState> = {
  async loadUrlRewrite ({ commit }, { requestPath }): Promise<UrlRewrite | null> {
    if (!requestPath) {
      return null;
    }

    requestPath = requestPath.replace(/^[/]+|[/]+$/g, '');

    if (!requestPath) {
      return null;
    }

    const url = processURLAddress(`${config.urlRewrite.endpoint}/redirect?requestPath=${requestPath}`);

    const result = await TaskQueue.execute({
      url,
      payload: {
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
      },
      silent: true
    });

    if (result.code === 200) {
      const urlRewrite: UrlRewriteApiResponse = result.result;

      const targetPath = urlRewrite.target_path.replace(/^[/]+|[/]+$/g, '');

      if (requestPath === targetPath) {
        return null;
      }

      return {
        targetPath,
        redirectCode: urlRewrite.rewrite_options === 'RP' ? 301 : 302
      };
    }

    return null;
  }
}
