import Vue from 'vue';
import Router from 'vue-router';
import { readCookie, serverHarness } from './fixtures/output-cache';
import { createRequestServices } from '../../../../request-services/create-request-services';
Vue.use(Router);

function redirectRenderer (policy: string) {
  return async ctx => {
    const router = new Router({
      mode: 'abstract',
      routes: [
        { path: '/source/', redirect: to => policy === 'forward'
          ? { path: '/sign-in/', query: to.query }
          : policy === 'explicit' ? { path: '/sign-in/', query: { step: '2' } } : { path: '/sign-in/' } },
        { path: '/sign-in/', component: { render: h => h('div') } }
      ]
    });
    await router.push(ctx.url);
    ctx.output.cacheTags.add('page');
    ctx.server.response.setHeader('X-Synthetic', 'fresh');
    ctx.output.redirect = { code: 301, path: router.currentRoute.fullPath };
    return '';
  };
}

function expectedLocation (policy: string, query: string) {
  const base = policy === 'explicit' ? '/sign-in/?step=2' : '/sign-in/';
  if (!query) return base;
  return base + (base.includes('?') ? '&' : '?') + query;
}

const visitors = ['alice@example.test', 'bob@example.test'];
const visitorQuery = (email: string) => 'email=' + encodeURIComponent(email) + '&utm_source=' + email.split('@')[0];

describe('Each visitor receives their own stripped values on redirects', () => {
  it.each(['forward', 'inherited', 'explicit'])('%s in both orders, cold and prewarmed', async policy => {
    for (const order of [visitors, visitors.slice().reverse()]) {
      for (const prewarm of [false, true]) {
        const h = serverHarness(redirectRenderer(policy));
        if (prewarm) await h.visit('/source/');
        for (const email of [...order, ...order]) {
          const res = await h.visit('/source/?' + visitorQuery(email));
          expect(res.statusCode).toBe(301);
          expect(res.get('location')).toBe(expectedLocation(policy, visitorQuery(email)));
        }
        expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
        const stored = h.cache.entries.get('page:main:/source/').entry;
        expect(JSON.stringify(stored)).not.toMatch(/alice|bob/);
      }
    }
  });
});

describe('Query-free and parameterized requests share one redirect entry', () => {
  it.each([false, true])('parameterized first: %s', async parameterizedFirst => {
    const h = serverHarness(redirectRenderer('inherited'));
    const parameterized = '/source/?email=alice%40example.test';
    const order = parameterizedFirst ? [parameterized, '/source/'] : ['/source/', parameterized];
    for (const url of [...order, ...order]) {
      const res = await h.visit(url);
      expect(res.get('location')).toBe(url === parameterized ? '/sign-in/?email=alice%40example.test' : '/sign-in/');
    }
    expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
    expect(h.cache.set).toHaveBeenCalledTimes(1);
  });
});

it.each([false, true])('reattaches only current AppLovin pairs in both arrival orders: %s', async reverse => {
  const h = serverHarness(ctx => {
    ctx.output.cacheTags.add('page');
    ctx.output.redirect = { code: 301, path: '/target/?aleid=destination#fragment' };
    return '';
  });
  const cases = [
    ['/source/?aleid=visitor%2Bone&alart=first%2Fvalue', '/target/?aleid=destination&alart=first%2Fvalue#fragment'],
    ['/source/?alart=second%2Bvalue', '/target/?aleid=destination&alart=second%2Bvalue#fragment'],
    ['/source/', '/target/?aleid=destination#fragment']
  ];
  if (reverse) cases.reverse();
  for (const [url, location] of [...cases, ...cases]) {
    expect((await h.visit(url)).get('location')).toBe(location);
  }
  expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
  expect(JSON.stringify([...h.cache.entries.values()])).not.toMatch(/visitor|first|second/);
});

it.each([false, true])('reattaches only current Maestra pairs in both arrival orders: %s', async reverse => {
  const h = serverHarness(ctx => {
    ctx.output.cacheTags.add('page');
    ctx.output.redirect = { code: 301, path: '/target/?step=2#fragment' };
    return '';
  });
  const cases = [
    ['/source/?m-message-click-id=first%2Bvalue&m-message-click-id=first%2Ftwo', '/target/?step=2&m-message-click-id=first%2Bvalue&m-message-click-id=first%2Ftwo#fragment'],
    ['/source/?m-message-click-id=second%2Bvalue', '/target/?step=2&m-message-click-id=second%2Bvalue#fragment'],
    ['/source/', '/target/?step=2#fragment']
  ];
  if (reverse) cases.reverse();
  for (const [url, location] of [...cases, ...cases]) {
    expect((await h.visit(url)).get('location')).toBe(location);
  }
  expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
  expect(JSON.stringify([...h.cache.entries])).not.toMatch(/first|second|m-message-click-id/);
});

describe('Query-free redirects remain cacheable', () => {
  it('retains headers, Location and status on a hit', async () => {
    const h = serverHarness(redirectRenderer('explicit'));
    const miss = await h.visit('/source/');
    const hit = await h.visit('/source/');
    expect(miss.get('x-vs-cache')).toBe('Miss');
    expect(hit.get('x-vs-cache')).toBe('Hit');
    expect(hit.get('location')).toBe(miss.get('location'));
    expect(hit.get('x-synthetic')).toBe('fresh');
    expect(hit.statusCode).toBe(301);
    expect(h.renderer.renderToString).toHaveBeenCalledTimes(1);
  });
});

describe('Application redirects follow the server redirect path', () => {
  it.each(['request-services', 'country-dependent'])('%s redirect is recorded and sent once', async mode => {
    const h = serverHarness(ctx => {
      if (mode === 'country-dependent') readCookie(ctx, 'detected_country');
      ctx.output.cacheTags.add('page');
      createRequestServices(ctx).redirect('/rewritten/' + (ctx.url.includes('?') ? ctx.url.slice(ctx.url.indexOf('?')) : ''), 301);
      return 'discarded page';
    });
    for (const email of [...visitors, ...visitors]) {
      const res = await h.visit('/legacy/?step=1&' + visitorQuery(email), 'detected_country=US');
      expect(res.redirect).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(301);
      expect(res.get('location')).toBe('/rewritten/?step=1&' + visitorQuery(email));
      expect(res.end).not.toHaveBeenCalled();
    }
    expect(h.renderer.renderToString).toHaveBeenCalledTimes(mode === 'country-dependent' ? 4 : 1);
    if (mode === 'country-dependent') expect(h.cache.set).not.toHaveBeenCalled();
    else expect(h.logger.warn).not.toHaveBeenCalled();
    expect(JSON.stringify([...h.cache.entries.values()])).not.toMatch(/alice|bob/);
  });
});

describe('Redirect tag and wildcard remove redirects', () => {
  it('registers tags and uses the authorized production invalidation callback', async () => {
    const fs = require('fs');
    // Deployments generate config/local.json from this template; its list replaces the default one.
    const template = fs.readFileSync('config/local.json.template', 'utf8');
    expect(JSON.parse(template.match(/"availableCacheTags":\s*(\[[\s\S]*?\])/)[1])).toEqual(expect.arrayContaining(['redirect']));
    const h = serverHarness(redirectRenderer('inherited'));
    for (const tag of ['redirect', '*']) {
      await h.visit('/source/');
      await h.visit('/source/?email=alice%40example.test');
      expect(h.cache.entries.size).toBe(1);
      const count = h.renderer.renderToString.mock.calls.length;
      await h.invalidate(tag);
      expect(h.cache.entries.size).toBe(0);
      await h.visit('/source/');
      expect(h.renderer.renderToString).toHaveBeenCalledTimes(count + 1);
    }
  });
});
