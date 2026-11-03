import { readCookie, serverHarness } from './fixtures/output-cache';
import { resolveDeliveryCountryBucket } from 'src/modules/customization-system/helpers/resolve-delivery-country-bucket';

function holiday (ctx) {
  ctx.output.cacheTags.add('page');
  const bucket = resolveDeliveryCountryBucket(readCookie(ctx, 'detected_country'));
  return bucket === 'US'
    ? '<label>United States</label><option>In time for Christmas: 5 spots</option>'
    : '<label>International</label><option>After Christmas: 3 spots</option>';
}

describe('Country pages cache distinct first paints', () => {
  it.each([['US', 'FR'], ['FR', 'US']])('%s then %s', async (first, second) => {
    const h = serverHarness(holiday);
    for (const country of [first, second, first, second]) {
      const res = await h.visit('/holiday/', 'detected_country=' + country);
      expect(res.body).toContain(country === 'US' ? 'United States' : 'International');
      expect(res.body).toContain(country === 'US' ? '5 spots' : '3 spots');
    }
    expect(h.renderer.renderToString).toHaveBeenCalledTimes(2);
    const base = 'page:main:/holiday/';
    expect(h.cache.entries.get(base).entry).toEqual({ kind: 'variation', cookies: ['detected_country'] });
    expect([...h.cache.entries.keys()].sort()).toEqual([base, base + ':detected_country:INTL', base + ':detected_country:US']);
    expect(h.cache.set.mock.calls[0][0]).toContain(':detected_country:');
    expect(h.cache.set.mock.calls[1][0]).toBe(base);
    h.cache.entries.delete(base + ':detected_country:US');
    expect((await h.visit('/holiday/', 'detected_country=US')).get('x-vs-cache')).toBe('Miss');
    h.cache.entries.get(base + ':detected_country:INTL').expires = h.cache.now;
    expect((await h.visit('/holiday/', 'detected_country=FR')).get('x-vs-cache')).toBe('Miss');
    h.cache.now += 899;
    expect((await h.visit('/holiday/', 'detected_country=US')).get('x-vs-cache')).toBe('Hit');
    h.cache.now++;
    expect((await h.visit('/holiday/', 'detected_country=US')).get('x-vs-cache')).toBe('Miss');
    h.cache.entries.delete(base);
    expect((await h.visit('/holiday/', 'detected_country=FR')).get('x-vs-cache')).toBe('Miss');
  });
});

describe('Missing or blank country uses the US bucket', () => {
  it.each([undefined, 'detected_country=', 'detected_country=   '])('cookie %s', async cookie => {
    const h = serverHarness(holiday);
    expect((await h.visit('/holiday/', cookie)).body).toContain('United States');
    for (const other of [undefined, 'detected_country=', 'detected_country=   ', 'detected_country=us']) {
      const res = await h.visit('/holiday/', other);
      expect(res.get('x-vs-cache')).toBe('Hit');
      expect(res.body).toContain('United States');
    }
    expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
    expect([...h.cache.entries.keys()]).toContain('page:main:/holiday/:detected_country:US');
  });
});

describe('Country-independent pages retain a single entry', () => {
  it.each([['US', 'FR'], ['FR', 'US']])('%s then %s', async (a, b) => {
    const h = serverHarness(() => '<p>Shared page</p>');
    for (const country of [a, b, a, b]) {
      expect((await h.visit('/shared/', 'detected_country=' + country)).body).toBe('<p>Shared page</p>');
    }
    expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
    expect([...h.cache.entries.keys()]).toEqual(['page:main:/shared/']);
    expect(h.cache.entries.get('page:main:/shared/').entry.kind).toBe('response');
  });
});

describe('Page and country tags remove every country entry', () => {
  it('removes marker and variants through authorized invalidation after reseeding', async () => {
    const h = serverHarness(holiday);
    for (const tag of ['page', 'detected_country', '*']) {
      await h.visit('/holiday/', 'detected_country=US');
      await h.visit('/holiday/', 'detected_country=FR');
      expect(h.cache.entries.size).toBe(3);
      for (const call of h.cache.set.mock.calls) expect(call[2]).toEqual(expect.arrayContaining(['page', 'detected_country']));
      await h.invalidate(tag, 'wrong-synthetic-secret');
      expect(h.cache.entries.size).toBe(3);
      await h.invalidate(tag);
      expect(h.cache.entries.size).toBe(0);
      const count = h.renderer.renderToString.mock.calls.length;
      await h.visit('/holiday/', 'detected_country=US');
      expect(h.renderer.renderToString).toHaveBeenCalledTimes(count + 1);
    }
  });
});
