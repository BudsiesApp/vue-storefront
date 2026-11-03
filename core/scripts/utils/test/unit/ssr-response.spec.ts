import { context, entryFixture, readCookie, request, response, serverHarness, settleWrites } from './fixtures/output-cache';
import { createRenderResponseHandler, createSsrErrorHandler } from '../../ssr-response';

describe('Application redirect owns the response', () => {
  it.each([true, false])('initial and later direct redirects, tagging %s', async tagging => {
    const fixture = await entryFixture({ sentOnInitial: true });
    const first = serverHarness(ctx => fixture.run(ctx).then(() => 'unused'), tagging);
    const direct = await first.visit('/page/?email=alice%40example.test');
    expect(direct.get('location')).toBe('/direct/');
    expect(direct.redirect).toHaveBeenCalledTimes(1);
    expect(direct.end).not.toHaveBeenCalled();
    expect(fixture.replace).not.toHaveBeenCalled();
    expect(fixture.asyncData).not.toHaveBeenCalled();
    expect(first.cache.set).not.toHaveBeenCalled();
    expect(first.hooks.beforeOutputRenderedResponse).not.toHaveBeenCalled();

    for (const pageTags of [false, true]) {
      let sentHeaders;
      const h = serverHarness(ctx => {
        if (pageTags) ctx.output.cacheTags.add('page');
        ctx.server.response.redirect(302, '/direct/?email=alice%40example.test');
        sentHeaders = ctx.server.response.setHeader.mock.calls.length;
        return 'unused';
      }, tagging);
      const result = await h.visit();
      expect(result.setHeader).toHaveBeenCalledTimes(sentHeaders);
      expect(result.redirect).toHaveBeenCalledTimes(1);
      expect(result.end).not.toHaveBeenCalled();
      expect(h.cache.set).not.toHaveBeenCalled();
      expect(h.hooks.beforeOutputRenderedResponse).not.toHaveBeenCalled();
      expect(h.hooks.afterOutputRenderedResponse).not.toHaveBeenCalled();
      expect(h.logger.warn).toHaveBeenCalledWith('/page/', 'response already sent by application code');
      h.renderer.renderToString.mockImplementation(() => 'subsequent request');
      expect((await h.visit('/next/')).body).toBe('subsequent request');
    }
  });

  it('guards callbacks before all header, cache, hook and error work', () => {
    const req = request();
    const res = response();
    const ctx = context(req, res);
    res.redirect(302, '/direct/');
    res.setHeader.mockClear();
    const logger = { warn: jest.fn(), error: jest.fn() };
    const dependencies = {
      req, res, context: ctx, outputCache: { prepare: jest.fn(), write: jest.fn() } as any,
      cacheRequest: {} as any, tagging: true, logger,
      beforeOutput: jest.fn(), afterOutput: jest.fn(), processOutput: jest.fn(), onComplete: jest.fn()
    };
    createRenderResponseHandler(dependencies)('unused');
    const onException = jest.fn();
    const apiStatus = jest.fn();
    createSsrErrorHandler({ req, res, logger, onException, apiStatus, isResourceNotFound: () => true })(new Error('synthetic'));
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(dependencies.outputCache.prepare).not.toHaveBeenCalled();
    expect(dependencies.outputCache.write).not.toHaveBeenCalled();
    expect(dependencies.processOutput).not.toHaveBeenCalled();
    expect(onException).not.toHaveBeenCalled();
    expect(apiStatus).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledTimes(1);
    expect(res.end).not.toHaveBeenCalled();
  });
});

describe('Response and cleanup failures are contained', () => {
  it.each(['sync-render', 'async-render', 'lookup', 'output', 'error-handler', 'cleanup'])(
    '%s before and after sent headers', async failure => {
      for (const sent of [false, true]) {
        const error = new Error('synthetic ' + failure);
        const h = serverHarness(ctx => {
          if (sent) ctx.server.response.redirect(302, '/owned/');
          if (failure === 'sync-render' || failure === 'error-handler') throw error;
          if (failure === 'async-render') return Promise.reject(error);
          return 'safe';
        });
        if (failure === 'lookup') h.cache.get.mockImplementation(async () => { throw error; });
        if (failure === 'output') h.hooks.beforeOutputRenderedResponse.mockImplementation(() => { throw error; });
        if (failure === 'error-handler') h.hooks.ssrException.mockImplementation(() => { throw new Error('error callback'); });
        if (failure === 'cleanup') {
          const clear = h.cleanup.getMockImplementation();
          h.cleanup.mockImplementation(ctx => { clear(ctx); throw new Error('cleanup'); });
        }
        const res = response();
        if (sent && failure === 'lookup') res.redirect(302, '/owned/');
        await expect(h.execute(request(), res)).resolves.not.toThrow();
        await settleWrites();
        if (failure !== 'lookup') expect(h.cleanup).toHaveBeenCalledTimes(1);
        if (sent) {
          expect(res.redirect).toHaveBeenCalledTimes(1);
          expect(res.get('location')).toBe('/owned/');
          expect(res.end).not.toHaveBeenCalled();
          expect(h.cache.set).not.toHaveBeenCalled();
        } else if (!['cleanup', 'error-handler'].includes(failure)) {
          expect(res.get('location')).toBe('/error');
        }
        if (failure === 'error-handler' || failure === 'cleanup') expect(h.logger.error).toHaveBeenCalled();
      }
    }
  );

  it('preserves unsent not-found and resource error handling', () => {
    for (const resource of [false, true]) {
      const req = request();
      const res = response();
      const apiStatus = jest.fn();
      const onException = jest.fn();
      createSsrErrorHandler({
        req, res, apiStatus, onException, isResourceNotFound: () => resource,
        logger: { warn: jest.fn(), error: jest.fn() }
      })({ code: 404 });
      if (resource) expect(apiStatus).toHaveBeenCalledWith(res, 'Vue Storefront: Resource is not found', 404);
      else expect(res.redirect).toHaveBeenCalledWith('/page-not-found');
      expect(onException).not.toHaveBeenCalled();
    }
  });

  it('completes a response before a pending variant write and retains inputs after cleanup', async () => {
    let ctx;
    const h = serverHarness(value => {
      ctx = value;
      readCookie(value, 'detected_country');
      value.output.cacheTags.add('page');
      return 'country HTML';
    });
    const originalSet = h.cache.set.getMockImplementation();
    let release;
    const pending = new Promise<void>(resolve => { release = resolve; });
    h.cache.set.mockImplementationOnce(async (key, entry, tags) => {
      await pending;
      return originalSet(key, entry, tags);
    });
    const res = response();
    await h.execute(request('/pending/', 'detected_country=US'), res);
    expect(res.body).toBe('country HTML');
    expect(res.headersSent).toBe(true);
    expect(ctx.output.cookieReads).toBeUndefined();
    expect(ctx.output.cacheTags).toBeUndefined();
    expect(h.cache.entries.size).toBe(0);
    release();
    await settleWrites();
    expect(h.cache.entries.get('page:main:/pending/').entry).toEqual({ kind: 'variation', cookies: ['detected_country'] });
    expect(h.cache.entries.get('page:main:/pending/:detected_country:US').entry).toMatchObject({ body: 'country HTML' });
    expect(h.cache.set.mock.calls[1][2]).toEqual(['page', 'detected_country']);
    expect(res.get('x-vs-cache-tags')).toContain('detected_country');
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('logs detached write failures without invoking response error handling', async () => {
    const h = serverHarness(() => 'safe');
    let rejectWrite;
    h.cache.set.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    const res = await h.visit();
    expect(h.cleanup).toHaveBeenCalledTimes(1);
    rejectWrite(new Error('synthetic write failure'));
    await settleWrites();
    expect(res.body).toBe('safe');
    expect(res.redirect).not.toHaveBeenCalled();
    expect(h.hooks.ssrException).not.toHaveBeenCalled();
    expect(h.cleanup).toHaveBeenCalledTimes(1);
    expect(h.logger.error).toHaveBeenCalledWith('Output cache write failed:', '/page/', expect.any(Error));
  });
});
