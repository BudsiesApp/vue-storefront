import { splitPageCacheUrl } from '../../page-cache-key';
import { createSsrDiagnostics } from '../../ssr-diagnostics';
import { createSsrErrorHandler } from '../../ssr-response';
import { request, response, serverHarness, settleWrites } from './fixtures/output-cache';

it('isolates decoded semantic credential names while preserving current-request pairs', () => {
  const url = new URL('https://example.test/p/?%70assword=synthetic&x=1&DIRECT_CRM_TICKET=other&password=');
  expect(splitPageCacheUrl(url)).toEqual({
    cleanUrl: '/p/?x=1',
    strippedQuery: '%70assword=synthetic&DIRECT_CRM_TICKET=other&password='
  });
});

it('uses a safe diagnostic copy without modifying the live request', () => {
  const req = { url: '/p/?password=synthetic&x=1', originalUrl: '/p/?password=synthetic&x=1' };
  const diagnostic = createSsrDiagnostics(req);
  const error = new Error('synthetic');
  error.name = 'synthetic';
  expect(JSON.stringify([diagnostic.url, diagnostic.request, diagnostic.error(error)])).not.toContain('synthetic');
  expect(req.url).toContain('synthetic');
});

it('does not log credential-bearing errors at the response boundary', () => {
  const req = { url: '/p/?password=synthetic&x=1' } as any;
  const logger = { error: jest.fn(), warn: jest.fn() };
  const res = { headersSent: false, redirect: jest.fn() } as any;
  const onException = jest.fn();
  createSsrErrorHandler({ req, res, logger, onException, apiStatus: jest.fn(), isResourceNotFound: () => false })(
    new Error('synthetic')
  );
  expect(JSON.stringify(logger.error.mock.calls)).not.toContain('synthetic');
  expect(res.redirect).toHaveBeenCalledWith('/error');
  expect(req.url).toContain('synthetic');
});

it('keeps existing diagnostic detail for requests without protected names', () => {
  const req = { url: '/p/?utm_source=campaign' };
  const error = new Error('ordinary detail');
  const diagnostic = createSsrDiagnostics(req);
  expect(diagnostic.request).toBe(req);
  expect(diagnostic.error(error)).toBe(error);
  expect(diagnostic.url).toBe(req.url);
});

it.each(['render', 'lookup', 'output', 'cleanup', 'hook', 'write'])(
  'does not expose protected request data in %s failure diagnostics', async failure => {
    const error = new Error('syntheticA syntheticB');
    const h = serverHarness(ctx => {
      ctx.output.cacheTags.add('page');
      if (failure === 'render' || failure === 'hook') throw error;
      return 'safe';
    });
    if (failure === 'lookup') h.cache.get.mockRejectedValue(error);
    if (failure === 'output') h.hooks.beforeOutputRenderedResponse.mockImplementation(() => { throw error; });
    if (failure === 'cleanup') h.cleanup.mockImplementation(() => { throw error; });
    if (failure === 'hook') h.hooks.ssrException.mockImplementation(() => { throw error; });
    if (failure === 'write') h.cache.set.mockRejectedValue(error);
    const req = request('/p/?password=syntheticA&direct-crm-ticket=syntheticB');
    await h.execute(req, response());
    await settleWrites();
    const diagnostics = JSON.stringify(
      [h.logger.error.mock.calls, h.logger.warn.mock.calls, h.hooks.ssrException.mock.calls],
      (_key, value) => value instanceof Error ? { message: value.message, stack: value.stack } : value
    );
    expect(diagnostics).not.toMatch(/syntheticA|syntheticB/);
    expect(req.url).toContain('syntheticA');
  }
);
