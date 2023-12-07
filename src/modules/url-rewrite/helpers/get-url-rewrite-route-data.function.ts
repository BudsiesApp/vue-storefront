import { normalizeUrlPath } from '@vue-storefront/core/modules/url/helpers';

export function getUrlRewriteRouteData (
  requestPath: string,
  redirectPath: string,
  query?: string
) {
  requestPath = normalizeUrlPath(requestPath, false);

  if (!requestPath.endsWith('/')) {
    requestPath = `${requestPath}/`
  }

  const queryString = query ? `?${query}` : '';

  return {
    name: 'url-rewrite',
    path: requestPath,
    params: {
      targetPath: `/${redirectPath}/${queryString}`
    }
  };
}
