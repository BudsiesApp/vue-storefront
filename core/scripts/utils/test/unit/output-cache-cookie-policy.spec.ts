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
        expect(h.logger.warn).toHaveBeenCalledTimes(2 * new Set(cookies.filter(name => name !== 'test-group')).size);
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
  it('does not cache a redirect when beforeOutput reads a private cookie', async () => {
    let ctx;
    const h = serverHarness(value => {
      ctx = value;
      value.output.redirect = { code: 301, path: '/destination/' };
      return '<div></div>';
    });
    h.hooks.beforeOutputRenderedResponse.mockImplementation(output => {
      readCookie(ctx, 'private-cookie');
      return { output };
    });
    const res = await h.visit('/late-redirect/', 'private-cookie=private');
    expect(res.get('location')).toBe('/destination/');
    expect(h.cache.set).not.toHaveBeenCalled();
    expect(h.hooks.afterOutputRenderedResponse).toHaveBeenCalledTimes(1);
  });

  it.each([['hook', true], ['hook', false], ['processing', true], ['processing', false]])('late reads in %s with tagging %s', async (stage, tagging) => {
    for (const [cookie, first, second] of [['private-cookie', 'ALICE', 'BOB'], ['detected_country', 'US', 'FR']]) {
      let ctx;
      const h = serverHarness(value => {
        ctx = value;
        return 'User: none';
      }, tagging);
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
      expect(h.cache.set).not.toHaveBeenCalled();
      expect(h.logger.warn).toHaveBeenCalledTimes(2);
    }
  });
});
