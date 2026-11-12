import { entryFixture, readCookie, serverHarness } from '../../scripts/utils/test/unit/fixtures/output-cache';
import { setServerRedirect } from '../../request-services/set-server-redirect';

describe('Router redirects resolve once from the clean URL', () => {
  it('returns the inherited clean query and lets the server append the visitor values', async () => {
    const fixture = await entryFixture({ routes: [
      { path: '/inherited/', redirect: { path: '/page/' } }
    ] });
    const h = serverHarness(ctx => fixture.run(ctx).then(() => ''));
    for (const email of ['alice@example.test', 'bob@example.test']) {
      const res = await h.visit('/inherited/?step=2&email=' + encodeURIComponent(email));
      expect(res.statusCode).toBe(301);
      expect(res.get('location')).toBe('/page/?step=2&email=' + encodeURIComponent(email));
    }
    expect(fixture.replace).not.toHaveBeenCalled();
    expect(fixture.preAsyncData).not.toHaveBeenCalled();
    expect(fixture.asyncData).not.toHaveBeenCalled();
    expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
  });

  it('skips page data when navigation records a redirect', async () => {
    const fixture = await entryFixture({ redirectOnInitial: true });
    const h = serverHarness(ctx => fixture.run(ctx).then(() => ''));
    const res = await h.visit('/page/?email=alice%40example.test');
    expect(res.get('location')).toBe('/recorded/?step=1&email=alice%40example.test');
    expect(res.redirect).toHaveBeenCalledTimes(1);
    expect(fixture.replace).not.toHaveBeenCalled();
    expect(fixture.asyncData).not.toHaveBeenCalled();
  });
});

describe('Redirects skip the real Vue tree', () => {
  it.each([
    ['navigation', { onNavigation: ctx => setServerRedirect(ctx, '/navigation/', 301) }, '/navigation/', 301],
    ['missing product', { onData: ctx => { ctx.output.cacheTags.add('no-cache'); setServerRedirect(ctx, '/404', 302); } }, '/404', 302],
    ['checkout', { onData: ctx => setServerRedirect(ctx, '/cart/', 302) }, '/cart/', 302],
    ['queued configurable child', { onFlush: ctx => setServerRedirect(ctx, '/parent/', 301) }, '/parent/', 301]
  ])('%s completes without rendering or prefetching', async (_name, options, target, status) => {
    const fixture = await entryFixture(options as any);
    const h = serverHarness(ctx => fixture.html(ctx));
    const res = await h.visit('/page/');
    expect(res.statusCode).toBe(status);
    expect(res.get('location')).toBe(target);
    expect(res.redirect).toHaveBeenCalledTimes(1);
    for (const hook of [fixture.rootRender, fixture.rootPrefetch, fixture.pageRender, fixture.pagePrefetch]) expect(hook).not.toHaveBeenCalled();
    expect(res.body).not.toContain('Synthetic page');
    if (_name === 'navigation') {
      expect(fixture.preAsyncData).not.toHaveBeenCalled();
      expect(fixture.asyncData).not.toHaveBeenCalled();
    }
    if (_name === 'missing product') expect(h.cache.entries.size).toBe(0);
    else expect([...h.cache.entries.values()][0].entry.body).toBe('');
  });

  it('renders and prefetches normally without a redirect', async () => {
    const fixture = await entryFixture();
    const h = serverHarness(ctx => fixture.html(ctx));
    const res = await h.visit('/page/');
    expect(res.body).toContain('Synthetic page');
    for (const hook of [fixture.rootRender, fixture.rootPrefetch, fixture.pageRender, fixture.pagePrefetch]) expect(hook).toHaveBeenCalledTimes(1);
  });

  it('skips the Vue tree for a router redirect', async () => {
    const fixture = await entryFixture({ routes: [{ path: '/old/', redirect: '/page/' }] });
    const h = serverHarness(ctx => fixture.html(ctx));
    const res = await h.visit('/old/');
    expect(res.get('location')).toBe('/page/');
    expect(res.redirect).toHaveBeenCalledTimes(1);
    for (const hook of [fixture.preAsyncData, fixture.asyncData, fixture.rootRender, fixture.rootPrefetch, fixture.pageRender, fixture.pagePrefetch]) expect(hook).not.toHaveBeenCalled();
  });

  it.each(['navigation', 'queue'])('keeps %s no-cache exclusions', async stage => {
    const record = ctx => { ctx.output.cacheTags.add('no-cache'); setServerRedirect(ctx, '/private/', 302); };
    const options = stage === 'navigation' ? { onNavigation: record } : { onFlush: record };
    const fixture = await entryFixture(options);
    const h = serverHarness(ctx => fixture.html(ctx));
    const res = await h.visit('/page/');
    expect(res.get('location')).toBe('/private/');
    expect(res.get('x-vs-cache-tags')).toContain('no-cache');
    expect(h.cache.entries.size).toBe(0);
  });

  it.each(['navigation', 'data'])('does not share cookie-dependent redirects from %s', async stage => {
    const record = ctx => { readCookie(ctx, 'private-cookie'); setServerRedirect(ctx, '/private/', 302); };
    const fixture = await entryFixture(stage === 'navigation' ? { onNavigation: record } : { onData: record });
    const h = serverHarness(ctx => fixture.html(ctx));
    const res = await h.visit('/page/', 'private-cookie=private');
    expect(res.get('location')).toBe('/private/');
    expect(h.cache.entries.size).toBe(0);
    expect(fixture.rootRender).not.toHaveBeenCalled();
  });
});

describe('Two visitors share clean HTML', () => {
  const visitors = [
    { email: 'alice@example.test', 'image-url': 'https://example.test/alice.png', coupon_code: 'ALICE10', applyPromoCode: 'alice-promo', utm_source: 'alice-campaign' },
    { email: 'bob@example.test', 'image-url': 'https://example.test/bob.png', coupon_code: 'BOB10', applyPromoCode: 'bob-promo', utm_source: 'bob-campaign' }
  ];
  it.each([false, true])('dynamic mapping: %s, both orders and repeat hits', async dynamic => {
    for (const order of [visitors, visitors.slice().reverse()]) {
      const fixture = await entryFixture({ dynamic });
      const h = serverHarness(async ctx => {
        const html = await fixture.html(ctx);
        if (dynamic) {
          expect(fixture.router.currentRoute.path).toBe('/dynamic');
          expect(ctx.output.redirect).toBeNull();
        }
        return html;
      });
      const path = dynamic ? '/dynamic/' : '/page/';
      let body;
      for (const visitor of [...order, ...order]) {
        const res = await h.visit(path + '?' + new URLSearchParams(visitor));
        if (body) expect(res.body).toBe(body);
        body = res.body;
        for (const values of visitors) for (const value of Object.values(values)) {
          expect(body).not.toContain(value);
          expect(body).not.toContain(encodeURIComponent(value));
        }
      }
      expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
      const tracking = await h.visit(path + '?utm_source=tracking-only');
      expect(tracking.get('x-vs-cache')).toBe('Hit');
      expect(tracking.body).toBe(body);
      expect(body).toContain('image-url=""');
      expect(fixture.store.state.route.query).toEqual({});
      expect(fixture.store.state.route.from?.query || {}).toEqual({});
      expect(fixture.store.state.route.fullPath).toBe(dynamic ? '/dynamic' : path);
      expect(fixture.store.state.url.prevRoute).toEqual({ scrollPosition: { x: 0, y: 0 }, categoryPageSize: 0 });
      expect(fixture.store.state.url.currentRoute.query).toEqual({});
      expect(fixture.store.state.route.params).toEqual(dynamic ? { slug: 'safe' } : {});
      expect(fixture.store.state.url.dispatcherMap).toEqual(dynamic ? { '/dynamic': { name: 'synthetic', path: '/dynamic', params: { slug: 'safe' } } } : {});
      expect(fixture.replace).not.toHaveBeenCalled();
    }
  });
});
