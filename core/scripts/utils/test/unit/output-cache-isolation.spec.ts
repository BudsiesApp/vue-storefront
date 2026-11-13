import { readCookie, serverHarness } from './fixtures/output-cache';
import { resolveDeliveryCountryBucket } from 'src/modules/customization-system/helpers/resolve-delivery-country-bucket';

describe('Store and A/B dimensions compose with country', () => {
  it.each(['normal', 'redirect', 'country', 'country-redirect'])('%s in both orders and repeated access', async mode => {
    for (const reverse of [false, true]) {
      const h = serverHarness(ctx => {
        const country = mode.startsWith('country') ? resolveDeliveryCountryBucket(readCookie(ctx, 'detected_country')) : 'shared';
        const body = [ctx.vs.storeCode, readCookie(ctx, 'test-group') || 'none', country].join('/');
        if (mode.includes('redirect')) ctx.output.redirect = { code: 301, path: '/target/' + body + '/' };
        return body;
      });
      const matrix = ['store-a', 'store-b'].flatMap(store =>
        [undefined, 'A', 'B'].flatMap(group => ['US', 'FR'].map(country => ({ store, group, country }))));
      if (reverse) matrix.reverse();
      for (const row of [...matrix, ...matrix]) {
        const cookie = 'detected_country=' + row.country + (row.group ? '; test-group=' + row.group : '');
        const result = await h.visit('/matrix/?step=2', cookie, row.store);
        const expected = [row.store, row.group || 'none', mode.startsWith('country')
          ? (row.country === 'US' ? 'US' : 'INTL') : 'shared'].join('/');
        expect(mode.includes('redirect') ? result.get('location') : result.body).toBe(
          mode.includes('redirect') ? '/target/' + expected + '/' : expected);
      }
      const renders = mode.startsWith('country') ? 24 : 6;
      expect(h.renderer.renderToString).toHaveBeenCalledTimes(renders);
      expect(h.cache.entries.size).toBe(mode.startsWith('country') ? 0 : 6);
      expect([...h.cache.entries.keys()].every(key => key.includes('?step=2'))).toBe(true);
    }
  });
});

describe('A/B values cannot address another cache entry', () => {
  it('keeps a crafted group value away from another group', async () => {
    const h = serverHarness(ctx => 'group:' + (readCookie(ctx, 'test-group') || 'none'));
    expect((await h.visit('/crafted/', 'detected_country=US')).body).toBe('group:none');
    const crafted = await h.visit('/crafted/', 'detected_country=FR; test-group=detected_country:US');
    expect(crafted.body).toBe('group:detected_country:US');
    expect((await h.visit('/crafted/', 'detected_country=US')).body).toBe('group:none');
    expect(new Set(h.cache.entries.keys()).size).toBe(h.cache.entries.size);
    expect([...h.cache.entries.keys()].filter(key => key.endsWith(':detected_country:US'))).toHaveLength(0);
  });
});

it.each([false, true])('shares clean HTML for AppLovin and query-free requests, reversed: %s', async reverse => {
  const h = serverHarness(ctx => {
    ctx.output.cacheTags.add('page');
    return JSON.stringify({ route: ctx.url, state: { path: ctx.url } });
  });
  const urls = ['/app/?step=1&aleid=one%2Bvalue', '/app/?step=1&alart=two%2Fvalue', '/app/?step=1'];
  if (reverse) urls.reverse();
  for (const url of [...urls, ...urls]) {
    const response = await h.visit(url);
    expect(response.body).toContain('/app/?step=1');
    expect(response.body).not.toMatch(/one|two|aleid|alart/);
  }
  expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
  expect(JSON.stringify([...h.cache.entries.values()])).not.toMatch(/one|two|aleid|alart/);
});

it.each([false, true])('isolates credential-bearing HTML in both orders: %s', async reverse => {
  const h = serverHarness(ctx => {
    ctx.output.cacheTags.add('page');
    return JSON.stringify({ route: ctx.url, state: { path: ctx.url } });
  });
  const urls = ['/secure/?step=1&%70assword=secretA', '/secure/?step=1&DIRECT_CRM_TICKET=secretB', '/secure/?step=1'];
  if (reverse) urls.reverse();
  for (const url of [...urls, ...urls]) {
    const response = await h.visit(url);
    expect(response.body).toContain('/secure/?step=1');
    expect(response.body).not.toMatch(/secretA|secretB/);
  }
  expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
  expect(JSON.stringify([...h.cache.entries])).not.toMatch(/secretA|secretB/);
});

it('renders a clean URL even when output caching is disabled', async () => {
  const h = serverHarness(ctx => JSON.stringify({ route: ctx.url }), true, false);
  const response = await h.visit('/secure/?step=1&password=synthetic&direct-crm-ticket=synthetic2');
  expect(response.body).toContain('/secure/?step=1');
  expect(response.body).not.toContain('synthetic');
  expect(h.cache.set).not.toHaveBeenCalled();
});
