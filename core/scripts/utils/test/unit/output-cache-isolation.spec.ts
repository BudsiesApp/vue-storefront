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
      const renders = mode.startsWith('country') ? 12 : 6;
      expect(h.renderer.renderToString).toHaveBeenCalledTimes(renders);
      expect(h.cache.entries.size).toBe(mode.startsWith('country') ? 18 : 6);
      expect([...h.cache.entries.keys()].every(key => key.includes('?step=2'))).toBe(true);
    }
  });
});
