import { splitPageCacheUrl } from '../../page-cache-key';
import { createSsrDiagnostics } from '../../ssr-diagnostics';
import { createSsrErrorHandler } from '../../ssr-response';

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
