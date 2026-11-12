import { createRequestServices } from '../../request-services/create-request-services';
import { entryFixture, serverHarness } from '../../scripts/utils/test/unit/fixtures/output-cache';

describe('Navigation fallback redirect integration', () => {
  it('invalidates a cached lookup miss after a rewrite is created', async () => {
    let exists = false;
    const h = serverHarness(async ctx => {
      const fixture = await entryFixture({ onNavigation: async value => {
        const Vue = require('vue').default || require('vue');
        Vue.prototype.$cacheTags = value.output.cacheTags;
        jest.doMock('@vue-storefront/core/modules/url/helpers', () => ({ normalizeUrlPath: (url: string) => url }));
        const { mappingFallbackForUrlRewrite } = require('src/modules/url-rewrite/mappingFallback');
        await mappingFallbackForUrlRewrite({ dispatch: async () => exists ? { targetPath: 'new', redirectCode: 302 } : null }, {
          url: '/Old/', params: {}, redirect: createRequestServices(value).redirect
        });
        delete Vue.prototype.$cacheTags;
      } });
      return fixture.html(ctx);
    });
    expect((await h.visit('/page/')).body).toContain('Synthetic page');
    expect((await h.visit('/page/')).get('x-vs-cache')).toBe('Hit');
    exists = true;
    await h.invalidate('url_rewrite_old');
    const res = await h.visit('/page/');
    expect(res.statusCode).toBe(302);
    expect(res.get('location')).toBe('/new/');
    expect(res.get('x-vs-cache')).toBe('Miss');
  });

  it.each(['rewrite', 'storyblok', 'storyblok-with-prior-tag'])('%s skips the not-found page and caches the redirect', async kind => {
    let target = 'first';
    const h = serverHarness(async ctx => {
      const fixture = await entryFixture({ onNavigation: async value => {
        const Vue = require('vue').default || require('vue');
        Vue.prototype.$cacheTags = value.output.cacheTags;
        if (kind === 'storyblok-with-prior-tag') value.output.cacheTags.add('page');
        const redirect = createRequestServices(value).redirect;
        if (kind === 'rewrite') {
          jest.doMock('@vue-storefront/core/modules/url/helpers', () => ({ normalizeUrlPath: (url: string) => url }));
          const { mappingFallbackForUrlRewrite } = require('src/modules/url-rewrite/mappingFallback');
          await mappingFallbackForUrlRewrite({ dispatch: async () => ({ targetPath: target, redirectCode: 301 }) }, { url: '/Old/', params: {}, redirect });
        } else {
          jest.doMock('@vue-storefront/core/lib/multistore', () => ({ removeStoreCodeFromRoute: (url: string) => url }));
          const { forStoryblok } = require('src/modules/vsf-storyblok-module/mappingFallback');
          await forStoryblok({ dispatch: async () => true, rootState: { storyblok: {} } }, { url: '/Old/', params: {}, redirect });
        }
        delete Vue.prototype.$cacheTags;
      }, onData: value => { value.output.cacheTags.add('no-cache'); value.server.response.status(404); } });
      const result = await fixture.html(ctx);
      expect(fixture.preAsyncData).not.toHaveBeenCalled();
      expect(fixture.asyncData).not.toHaveBeenCalled();
      for (const hook of [fixture.rootRender, fixture.rootPrefetch, fixture.pageRender, fixture.pagePrefetch]) expect(hook).not.toHaveBeenCalled();
      return result;
    });
    const first = await h.visit('/page/?email=first%40example.test');
    const second = await h.visit('/page/?email=second%40example.test');
    const path = kind === 'rewrite' ? '/first/' : '/old/';
    expect(first.get('location')).toBe(path + '?email=first%40example.test');
    expect(second.get('location')).toBe(path + '?email=second%40example.test');
    expect(first.get('x-vs-cache')).toBe('Miss');
    expect(second.get('x-vs-cache')).toBe('Hit');
    expect(first.statusCode).toBe(301);
    expect(first.redirect).toHaveBeenCalledTimes(1);
    expect(second.redirect).toHaveBeenCalledTimes(1);
    const entry = [...h.cache.entries.values()][0].entry;
    expect(entry.body).toBe('');
    expect(JSON.stringify(entry)).not.toContain('example.test');
    expect(h.cache.set.mock.calls[0][2]).toEqual(kind === 'rewrite'
      ? expect.arrayContaining(['redirect', 'url_rewrite', 'url_rewrite_old'])
      : kind === 'storyblok' ? ['redirect'] : ['page', 'redirect']);
    if (kind === 'rewrite') {
      target = 'second';
      await h.invalidate('url_rewrite_old');
      expect((await h.visit('/page/')).get('location')).toBe('/second/');
    }
  });
});
