import { entryFixture, serverHarness } from '../../scripts/utils/test/unit/fixtures/output-cache';

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
