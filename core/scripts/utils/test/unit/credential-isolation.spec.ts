import { splitPageCacheUrl } from '../../page-cache-key';
import { createSsrErrorHandler } from '../../ssr-response';

it('isolates decoded semantic names while preserving current-request pairs', () => {
  const url = new URL('https://example.test/p/?%70assword=synthetic&x=1&DIRECT_CRM_TICKET=other&password=');
  expect(splitPageCacheUrl(url)).toEqual({
    cleanUrl: '/p/?x=1',
    strippedQuery: '%70assword=synthetic&DIRECT_CRM_TICKET=other&password='
  });
});

it('filters the explicit URL log while preserving the request and exception', () => {
  const req = { url: '/p/?password=synthetic&x=1' } as any;
  const logger = { error: jest.fn(), warn: jest.fn() };
  const res = { headersSent: false, redirect: jest.fn() } as any;
  const onException = jest.fn();
  const error = new Error('ordinary failure detail');
  createSsrErrorHandler({ req, res, logger, onException, apiStatus: jest.fn(), isResourceNotFound: () => false })(error);
  expect(logger.error).toHaveBeenCalledWith('Error during render:', '/p/?x=1', error);
  expect(onException).toHaveBeenCalledWith(error);
  expect(res.redirect).toHaveBeenCalledWith('/error');
  expect(req.url).toBe('/p/?password=synthetic&x=1');
});
