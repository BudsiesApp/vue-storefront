import { Context } from '@vue-storefront/core/scripts/utils/types';

/**
 * Records an SSR redirect for the page server to send. Application code never writes the HTTP
 * response itself, so the server can apply one redirect and caching policy to every redirect.
 */
export function setServerRedirect (
  context: Pick<Context, 'output'>,
  path: string,
  statusCode = 302
): void {
  context.output.redirect = {
    code: statusCode === 301 ? 301 : 302,
    path
  };
}
