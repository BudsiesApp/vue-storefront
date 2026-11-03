import { context, readCookie, request, serverHarness } from './fixtures/output-cache';
import { createRequestServices } from '../../../../request-services/create-request-services';

describe('An unregistered cookie disables all writes', () => {
  it.each([true, false])('tracks names per context, tagging %s', async tagging => {
    const a = context(request('/page/', 'private-cookie=ALICE10'));
    const b = context(request('/page/', 'detected_country=FR'));
    expect(readCookie(a, 'private-cookie')).toBe('ALICE10');
    expect(readCookie(b, 'detected_country')).toBe('FR');
    expect(readCookie(a, 'missing-cookie')).toBeUndefined();
    readCookie(a, 'private-cookie');
    expect([...a.output.cookieReads]).toEqual(['private-cookie', 'missing-cookie']);
    expect([...b.output.cookieReads]).toEqual(['detected_country']);
    expect(Object.keys(createRequestServices(a)).sort()).toEqual(['getCookie', 'host', 'redirect', 'userAgent']);

    for (const cookies of [
      ['private-cookie'], ['missing-cookie'],
      ['private-cookie', 'detected_country'], ['private-cookie', 'test-group'],
      ['private-cookie', 'test-group', 'detected_country']
    ]) {
      for (const redirect of [false, true]) {
        const h = serverHarness(ctx => {
          for (const name of [...cookies, ...cookies]) readCookie(ctx, name);
          if (redirect) ctx.output.redirect = { code: 301, path: '/destination/' };
          return 'synthetic';
        }, tagging);
        for (let i = 0; i < 2; i++) {
          const res = await h.visit('/cookie/', 'private-cookie=ALICE10; test-group=A; detected_country=FR');
          expect(res.get('x-vs-cache')).toBe('Miss');
          if (tagging) expect(res.get('x-vs-cache-tags')).toContain('no-cache');
        }
        expect(h.cache.set).not.toHaveBeenCalled();
        expect(h.renderer.renderToString).toHaveBeenCalledTimes(2);
        expect(h.logger.warn).toHaveBeenCalledTimes(2);
        expect(JSON.stringify(h.logger.warn.mock.calls)).not.toMatch(/ALICE10|FR|test-group/);
      }
    }
    for (const country of [false, true]) for (const redirect of [false, true]) {
      const noCache = serverHarness(ctx => {
        if (country) readCookie(ctx, 'detected_country');
        if (redirect) ctx.output.redirect = { code: 301, path: '/destination/' };
        ctx.output.cacheTags.add('no-cache');
        return 'synthetic';
      }, tagging);
      await noCache.visit('/cookie/', 'detected_country=US');
      expect(noCache.cache.set).not.toHaveBeenCalled();
    }

    const safe = serverHarness(ctx => {
      readCookie(ctx, 'test-group');
      return 'safe';
    }, tagging);
    await safe.visit('/cookie/', 'test-group=A');
    expect((await safe.visit('/cookie/', 'test-group=A')).get('x-vs-cache')).toBe('Hit');
    expect(safe.logger.warn).not.toHaveBeenCalled();
    expect(safe.cache.entries.size).toBe(1);
    if (!tagging) expect(safe.cache.set.mock.calls[0][2]).toEqual([]);
  });
});

describe('Cookie reads during output processing are classified before writing', () => {
  it.each(['hook', 'processing'])('late reads in %s', async stage => {
    for (const [cookie, first, second] of [['private-cookie', 'ALICE', 'BOB'], ['detected_country', 'US', 'FR']]) {
      let ctx;
      const h = serverHarness(value => {
        ctx = value;
        return 'User: none';
      });
      const late = output => {
        const value = readCookie(ctx, cookie);
        return output.replace('none', value || 'none');
      };
      if (stage === 'hook') h.hooks.beforeOutputRenderedResponse.mockImplementation(output => ({ output: late(output) }));
      else h.processOutput.mockImplementation(late);
      const alice = await h.visit('/late/', cookie + '=' + first);
      const bob = await h.visit('/late/', cookie + '=' + second);
      expect(alice.body).toBe('User: ' + first);
      expect(bob.body).toBe('User: ' + second);
      if (cookie === 'private-cookie') {
        expect(h.cache.set).not.toHaveBeenCalled();
        expect(h.logger.warn).toHaveBeenCalledTimes(2);
      } else {
        expect(h.cache.entries.get('page:main:/late/').entry).toEqual({ kind: 'variation', cookies: ['detected_country'] });
        expect(h.logger.warn).not.toHaveBeenCalled();
      }
    }
  });
});
