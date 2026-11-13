import fetch from '@vue-storefront/core/lib/fetch';

import { execute } from '../../task';
import TaskResponseError from '../../types/TaskResponseError';
import { Logger } from '@vue-storefront/core/lib/logger';

jest.mock('config', () => ({
  storeViews: { multistore: false },
  users: { tokenInHeader: false },
  queues: { maxNetworkTaskAttempts: 1 }
}));
jest.mock('@vue-storefront/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));
jest.mock('@vue-storefront/core/lib/fetch', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@vue-storefront/core/store', () => ({ __esModule: true, default: { state: {}, dispatch: jest.fn() } }));
jest.mock('@vue-storefront/core/lib/multistore', () => ({ adjustMultistoreApiUrl: (url: string) => url, currentStoreView: () => ({}) }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({ __esModule: true, default: { $emit: jest.fn() } }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => () => {}), info: jest.fn(() => () => {}), debug: jest.fn(() => () => {}), log: jest.fn(() => () => {}) } }));
jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: {} }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: {} }));
jest.mock('@vue-storefront/core/helpers', () => ({ processURLAddress: (url: string) => url, serial: jest.fn(), onlineHelper: {} }));
jest.mock('src/modules/shared', () => ({ BEFORE_STORE_BACKEND_API_REQUEST: 'before-request' }));

function createResponse (status: number, contentType: string, json: () => Promise<unknown>) {
  return { status, headers: { get: () => contentType }, json };
}

function createTask () {
  return { url: '/api/address/update?token={{token}}', payload: {}, silent: true } as any;
}

describe('TaskQueue response failures', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([403, 503])('keeps HTTP %i when the response is not JSON', async (status) => {
    (fetch as jest.Mock).mockResolvedValue(createResponse(status, 'text/html', jest.fn()));

    const error = await execute(createTask()).catch((reason) => reason);

    expect(error).toBeInstanceOf(TaskResponseError);
    expect(error.status).toBe(status);
  });

  it('keeps the HTTP status when a JSON body cannot be parsed', async () => {
    (fetch as jest.Mock).mockResolvedValue(createResponse(502, 'application/json', () => Promise.reject(new SyntaxError('Unexpected token <'))));

    const error = await execute(createTask()).catch((reason) => reason);

    expect(error).toBeInstanceOf(TaskResponseError);
    expect(error.status).toBe(502);
  });

  it.each([403, 503])('keeps HTTP %i when a JSON body has no VSF API code', async (status) => {
    (fetch as jest.Mock).mockResolvedValue(createResponse(status, 'application/json', async () => ({ message: 'Forbidden' })));

    const error = await execute(createTask()).catch((reason) => reason);

    expect(error).toBeInstanceOf(TaskResponseError);
    expect(error.status).toBe(status);
  });

  it.each([
    ['text/html', async () => ({}), '/api/address/update?token={{token}}#fragment-secret', '/api/address/update'],
    ['application/json', async () => ({ message: 'Forbidden' }), 'https://user:password@example.com/api/address/update?token={{token}}#fragment-secret', 'https://example.com/api/address/update'],
    ['application/json', async () => ({}), 'http://[invalid?token={{token}}', '[invalid request URL]']
  ])('sanitizes the URL in %s response errors', async (contentType, json, url, expectedUrl) => {
    (fetch as jest.Mock).mockResolvedValue(createResponse(503, contentType, json));
    const task = { ...createTask(), url };

    const error = await execute(task, 'dummy-secret').catch((reason) => reason);

    expect(error).toBeInstanceOf(TaskResponseError);
    expect(error.status).toBe(503);
    expect(error.message).toContain(expectedUrl);
    expect(error.message).not.toMatch(/dummy-secret|password|fragment-secret/);
  });

  it.each([null, 'Forbidden'])('keeps the HTTP status when a JSON body is %p', async (body) => {
    (fetch as jest.Mock).mockResolvedValue(createResponse(503, 'application/json', async () => body));

    const error = await execute(createTask()).catch((reason) => reason);

    expect(error).toBeInstanceOf(TaskResponseError);
    expect(error.status).toBe(503);
  });

  it('keeps the original rejection for a network failure', async () => {
    const networkError = new TypeError('Failed to fetch');
    (fetch as jest.Mock).mockRejectedValue(networkError);

    await expect(execute(createTask())).rejects.toBe(networkError);
  });

  it('resolves a JSON error response with its result code', async () => {
    (fetch as jest.Mock).mockResolvedValue(createResponse(503, 'application/json', async () => ({ code: 503, result: { errorMessage: 'Down' } })));

    await expect(execute(createTask())).resolves.toMatchObject({ resultCode: 503 });
  });

  it.each([200, 500])('does not log an opted-out HTTP %i response result while preserving the result', async status => {
    const result = { errorMessage: 'synthetic-protected-result' };
    (fetch as jest.Mock).mockResolvedValue(createResponse(status, 'application/json', async () => ({ code: status, result })));
    const task = { ...createTask(), logResponse: false };

    await expect(execute(task)).resolves.toMatchObject({ resultCode: status, result, transmited: true });
    expect(Logger.debug).not.toHaveBeenCalled();
    expect(Logger.info).toHaveBeenCalledWith(expect.any(String), 'sync', undefined);
  });

  it('retains ordinary response diagnostics by default', async () => {
    (fetch as jest.Mock).mockResolvedValue(createResponse(500, 'application/json', async () => ({ code: 500, result: 'ordinary-detail' })));

    const task = createTask();
    await expect(execute(task)).resolves.toMatchObject({ resultCode: 500, result: 'ordinary-detail' });
    expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('ordinary-detail'), 'sync');
    expect(Logger.info).toHaveBeenCalledWith(expect.any(String), 'sync', task);
  });

  it('logs no opted-out parsing failure detail but preserves the rejection', async () => {
    (fetch as jest.Mock).mockResolvedValue(createResponse(500, 'application/json', async () => {
      throw new SyntaxError('synthetic-protected-result');
    }));

    const error = await execute({ ...createTask(), logResponse: false }).catch(reason => reason);
    expect(error).toBeInstanceOf(TaskResponseError);
    expect(error.message).toBe('synthetic-protected-result');
    expect(Logger.error).toHaveBeenCalledWith('Error executing sync task', 'sync');
  });
});
