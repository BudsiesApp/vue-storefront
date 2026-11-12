import Vue from 'vue';
import { mappingFallbackForUrlRewrite } from '../../mappingFallback';

jest.mock('@vue-storefront/core/modules/url/helpers', () => ({
  normalizeUrlPath: (path: string) => path.startsWith('/') ? path : '/' + path
}));

describe('URL rewrite mapping fallback', () => {
  const tags = new Set<string>();
  const dispatch = jest.fn();
  const context = { dispatch } as any;

  beforeEach(() => {
    tags.clear();
    dispatch.mockReset();
    Vue.prototype.$cacheTags = tags;
  });
  afterEach(() => { delete Vue.prototype.$cacheTags; });

  it.each([301, 302])('records status %s and preserves target and query', async code => {
    dispatch.mockResolvedValue({ targetPath: 'new-path', redirectCode: code });
    const redirect = jest.fn();
    expect(await mappingFallbackForUrlRewrite(context, { url: '/Old/', params: { step: '2' }, redirect })).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith('/new-path/?step=2', code);
    expect(tags).toEqual(new Set(['url_rewrite', 'url_rewrite_old']));
  });

  it('returns the existing route data when no callback is supplied', async () => {
    dispatch.mockResolvedValue({ targetPath: 'new-path', redirectCode: 301 });
    expect(await mappingFallbackForUrlRewrite(context, { url: '/old', params: { step: '2' } })).toEqual({
      name: 'url-rewrite', path: '/old/', params: { targetPath: '/new-path/?step=2' }
    });
  });

  it.each(['/Old-Url', 'Old-Url/', '/Old-Url/?step=2'])('tags hits and misses for %s', async url => {
    for (const result of [null, { targetPath: 'new', redirectCode: 301 }]) {
      tags.clear();
      dispatch.mockResolvedValue(result);
      await mappingFallbackForUrlRewrite(context, { url, params: {}, redirect: jest.fn() });
      expect(tags).toEqual(new Set(['url_rewrite', 'url_rewrite_old-url']));
      expect(dispatch).toHaveBeenLastCalledWith('urlRewrite/loadUrlRewrite', { requestPath: url }, { root: true });
    }
  });
});
