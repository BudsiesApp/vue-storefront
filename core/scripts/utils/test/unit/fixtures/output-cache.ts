import { OutputCacheEntry, OutputCacheStorage } from '../../../output-cache-types';
import { createRequestServices } from '../../../../../request-services/create-request-services';
import { setServerRedirect } from '../../../../../request-services/set-server-redirect';
import { Context } from '../../../types';
import { splitPageCacheUrl } from '../../../page-cache-key';
import { createOutputCache, createCacheInvalidationHandler } from '../../../output-cache';
import { createRenderResponseHandler, createSsrErrorHandler, renderSsrResponse, lookupSsrResponse } from '../../../ssr-response';

export class MemoryCache implements OutputCacheStorage {
  public now = 0;
  public ttl = 900;
  public entries = new Map<string, { entry: OutputCacheEntry; expires: number }>();
  public tags = new Map<string, Set<string>>();
  public get = jest.fn(async (key: string) => {
    const value = this.entries.get(key);
    return value && value.expires > this.now ? JSON.parse(JSON.stringify(value.entry)) : null;
  });

  public set = jest.fn(async (key: string, entry: OutputCacheEntry, tags: string[]) => {
    this.entries.set(key, { entry: JSON.parse(JSON.stringify(entry)), expires: this.now + this.ttl });
    for (const tag of tags) {
      if (!this.tags.has(tag)) this.tags.set(tag, new Set());
      this.tags.get(tag).add(key);
    }
  });

  public invalidate = jest.fn(async (...tags: string[]) => {
    for (const tag of tags) {
      for (const key of this.tags.get(tag) || []) this.entries.delete(key);
      this.tags.delete(tag);
    }
  });
}

export function request (url = '/page/', cookie?: string, site = 'main') {
  return {
    url, originalUrl: url, path: url.split('?')[0], protocol: 'https',
    query: Object.fromEntries(new URL(url, 'https://example.test').searchParams),
    headers: { host: 'example.test', cookie, 'x-vs-store-code': site },
    get (name: string) { return this.headers[name]; },
    header (name: string) { return this.headers[name]; }
  } as any;
}

export function response () {
  const headers = {};
  const res: any = {
    headersSent: false,
    statusCode: 200,
    body: '',
    setHeader: jest.fn((name, value) => { headers[name.toLowerCase()] = value; }),
    get: jest.fn(name => headers[name.toLowerCase()]),
    getHeaders: jest.fn(() => ({ ...headers })),
    status: jest.fn(code => { res.statusCode = code; return res; }),
    end: jest.fn(body => { res.body = body; res.headersSent = true; return res; }),
    redirect: jest.fn((code, path) => {
      if (typeof code === 'string') { path = code; code = 302; }
      res.statusCode = code;
      headers['location'] = path;
      res.headersSent = true;
      return res;
    })
  };
  return res;
}

export function context (req = request(), res = response()) {
  const result: Context = {
    url: decodeURI(splitPageCacheUrl(new URL('https://example.test' + req.originalUrl)).cleanUrl),
    output: {
      prepend: () => '', append: () => '', filter: value => value, appendHead: () => '',
      template: 'default', cookieReads: new Set<string>(), cacheTags: new Set<string>(), redirect: null
    },
    server: { app: {} as any, request: req, response: res },
    meta: null, vs: { config: {}, storeCode: req.get('x-vs-store-code') }, extendedHead: null
  };
  return result;
}

export function readCookie (ctx, name: string) {
  return createRequestServices(ctx).getCookie(name);
}

export async function settleWrites () {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

// Exercise the same extracted lookup/render/error callbacks that server.ts wires.
export function serverHarness (render: (ctx: any) => any, tagging = true) {
  const cache = new MemoryCache();
  const logger = { warn: jest.fn(), error: jest.fn() };
  const renderer = { renderToString: jest.fn(render) };
  const hooks = {
    beforeCacheInvalidated: jest.fn(), afterCacheInvalidated: jest.fn(),
    beforeOutputRenderedResponse: jest.fn(output => ({ output })),
    afterOutputRenderedResponse: jest.fn(output => ({ output })),
    ssrException: jest.fn()
  };
  const config = {
    server: {
      useOutputCache: true, useOutputCacheTagging: tagging,
      availableCacheTags: ['page', 'redirect', 'url_rewrite'],
      invalidateCacheKey: 'synthetic-secret'
    },
    abTesting: { cookieKey: 'test-group' }
  };
  const outputCache = createOutputCache({ cache, config, logger });
  const processOutput = jest.fn((output: string) => output);
  const cleanup = jest.fn(ctx => {
    Object.keys(ctx.server).forEach(key => delete ctx.server[key]);
    delete ctx.output.cookieReads;
    delete ctx.output.cacheTags;
    delete ctx.output.redirect;
  });
  const invalidate = createCacheInvalidationHandler({
    config, cache,
    apiStatus: (res, body, code) => res.status(code).end(body),
    beforeInvalidated: hooks.beforeCacheInvalidated,
    afterInvalidated: hooks.afterCacheInvalidated,
    forwardInvalidation: jest.fn()
  });
  async function execute (req, res) {
    const cacheRequest = outputCache.createRequest(req.get('x-vs-store-code') || 'main',
      'https://example.test' + req.originalUrl, req.headers.cookie);
    const errorHandler = createSsrErrorHandler({
      req, res, logger, isResourceNotFound: () => false,
      apiStatus: (res, body, code) => res.status(code).end(body),
      onException: hooks.ssrException
    });
    return lookupSsrResponse({
      read: () => outputCache.read(cacheRequest), cacheRequest, res, onHit: jest.fn(),
      errorHandler, logFinalFailure: logger.error,
      onMiss: () => {
        const ctx = context(req, res);
        return renderSsrResponse({
          render: () => renderer.renderToString(ctx),
          renderHandler: createRenderResponseHandler({
            req, res, context: ctx, outputCache, cacheRequest, tagging, logger,
            beforeOutput: hooks.beforeOutputRenderedResponse,
            afterOutput: hooks.afterOutputRenderedResponse,
            processOutput, onComplete: jest.fn()
          }),
          errorHandler, cleanup: () => cleanup(ctx), logFinalFailure: logger.error
        });
      }
    });
  }
  return {
    cache, renderer, hooks, config, outputCache, logger, cleanup, execute, processOutput,
    async visit (url = '/page/', cookie?: string, site = 'main') {
      const res = response();
      await execute(request(url, cookie, site), res);
      await settleWrites();
      return res;
    },
    async invalidate (tag: string, key = 'synthetic-secret') {
      const req = request('/invalidate');
      req.query = { key, tag };
      const res = response();
      await invalidate(req, res);
      return res;
    }
  };
}

export async function entryFixture ({
  routes = [], beforeEach, dynamic = false, sentOnInitial = false, redirectOnInitial = false, onNavigation, onData, onFlush
}: {
  routes?: any[]; beforeEach?: (to: any, from: any, next: any) => any;
  dynamic?: boolean; sentOnInitial?: boolean; redirectOnInitial?: boolean;
  onNavigation?: (ctx: any) => any; onData?: (ctx: any) => any; onFlush?: (ctx: any) => any;
} = {}) {
  jest.resetModules();
  const Vue = require('vue').default || require('vue');
  const Vuex = require('vuex').default || require('vuex');
  const Router = require('vue-router').default || require('vue-router');
  Vue.use(Vuex);
  Vue.use(Router);
  const preAsyncData = jest.fn();
  let ctx;
  const asyncData = jest.fn(async () => { if (onData) await onData(ctx); });
  const pageRender = jest.fn();
  const pagePrefetch = jest.fn();
  const rootRender = jest.fn();
  const rootPrefetch = jest.fn();
  const Page = {
    preAsyncData, asyncData, serverPrefetch: pagePrefetch,
    render (h) {
      pageRender();
      return h('div', { attrs: { 'image-url': this.$route.query['image-url'] || this.$route.params['image-url'] || '' } }, 'Synthetic page');
    }
  };
  const router = new Router({ mode: 'abstract', routes: [
    { path: '/page/', component: Page }, { path: '/dynamic/', component: Page },
    { path: '/dynamic', name: 'main-synthetic', component: Page, pathToRegexpOptions: { strict: true } }, ...routes
  ] });
  const push = router.push.bind(router);
  router.push = (location, onComplete = () => {}, onAbort = () => {}) => push(location, onComplete, onAbort);
  const manager = {
    flushRouteQueue: jest.fn(), getRouteLockPromise: jest.fn(() => Promise.resolve())
  };
  jest.doMock('@vue-storefront/core/app', () => ({ createApp: jest.fn(), router, baseRouter: router }));
  jest.doMock('@vue-storefront/core/lib/router-manager', () => ({ RouterManager: manager }));
  jest.doMock('@vue-storefront/core/helpers', () => ({ isServer: true }));
  jest.doMock('@vue-storefront/core/lib/multistore', () => ({}));
  jest.doMock('@vue-storefront/core/lib/storeCodeFromRoute', () => ({ __esModule: true, default: () => 'main' }));
  jest.doMock('@vue-storefront/core/lib/logger', () => ({ Logger: { debug: () => jest.fn(), error: () => jest.fn() } }));
  jest.doMock('@vue-storefront/core/lib/async-data-loader', () => ({ AsyncDataLoader: { flush: async () => { if (onFlush) await onFlush(ctx); } } }));
  jest.doMock('../../../../../build/purge-config/purgeConfig', () => ({ __esModule: true, default: value => value }));
  jest.doMock('config', () => ({
    storeViews: { multistore: false }, server: { dynamicConfigReload: false }
  }));
  jest.doMock('../../../../../modules/url/helpers/transformUrl', () => ({}));
  jest.doMock('../../../../../modules/url/index', () => ({ cacheStorage: {} }));
  jest.doMock('@vue-storefront/core/lib/fetch', () => jest.fn());
  jest.doMock('@vue-storefront/core/modules/catalog/helpers/search', () => ({}));
  jest.doMock('@vue-storefront/core/modules/catalog/helpers/prepare', () => ({}));
  jest.doMock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({}));
  jest.doMock('src/modules/shared', () => ({}));
  const { actions } = require('../../../../../modules/url/store/actions');
  const { mutations } = require('../../../../../modules/url/store/mutations');
  const store = new Vuex.Store({
    modules: {
      url: {
        namespaced: true,
        state: { dispatcherMap: dynamic ? { '/dynamic': { name: 'synthetic', path: '/dynamic', params: { slug: 'safe' } } } : {}, currentRoute: {}, prevRoute: {} },
        mutations,
        actions,
        getters: {}

      }
    }
  });
  store.registerModule('category-next', { namespaced: true, getters: { getCategoryProducts: () => [] } });
  require('vuex-router-sync').sync(store, router);
  if (dynamic) router.beforeEach(async (to, _from, next) => {
    if (to.path !== '/dynamic/') return next();
    const data = await store.dispatch('url/mapUrl', { url: '/dynamic/', query: to.query });
    next({ name: data.name, params: data.params, query: to.query });
  });
  if (beforeEach) router.beforeEach(beforeEach);
  if (onNavigation) router.beforeEach(async (_to, _from, next) => { await onNavigation(ctx); next(); });
  if (sentOnInitial) router.beforeEach((_to, _from, next) => {
    ctx.server.response.redirect(302, '/direct/');
    next();
  });
  if (redirectOnInitial) router.beforeEach((_to, _from, next) => {
    setServerRedirect(ctx, '/recorded/?step=1', 301);
    next();
  });
  const app = new Vue({ router, store, serverPrefetch: rootPrefetch, render: h => { rootRender(); return h('router-view'); } });
  app.$meta = () => ({});
  const initialState = JSON.parse(JSON.stringify(store.state));
  require('@vue-storefront/core/app').createApp.mockResolvedValue({ app, router, store, initialState, head: null });
  const entry = require('../../../../../server-entry').default;
  const replace = jest.spyOn(router, 'replace');
  const commit = jest.spyOn(store, 'commit');
  return {
    app, router, store, initialState, replace, commit, manager, preAsyncData, asyncData, rootRender, rootPrefetch, pageRender, pagePrefetch,
    async run (value) { ctx = value; return entry(value); },
    async html (value) {
      ctx = value;
      const rendered = await entry(value);
      const body = await require('vue-server-renderer').createRenderer().renderToString(rendered);
      return body + '<script>window.__INITIAL_STATE__=' + JSON.stringify(value.state) +
        ';window.__BASE_STATE__=' + JSON.stringify(value.initialState) + '</script>';
    }
  };
}
