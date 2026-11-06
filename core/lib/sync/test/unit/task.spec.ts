import fetch from '@vue-storefront/core/lib/fetch';

import { execute } from '../../task';
import TaskResponseError from '../../types/TaskResponseError';

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
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: () => () => {}, info: () => () => {}, debug: () => () => {}, log: () => () => {} } }));
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

  it('keeps the original rejection for a network failure', async () => {
    const networkError = new TypeError('Failed to fetch');
    (fetch as jest.Mock).mockRejectedValue(networkError);

    await expect(execute(createTask())).rejects.toBe(networkError);
  });

  it('resolves a JSON error response with its result code', async () => {
    (fetch as jest.Mock).mockResolvedValue(createResponse(503, 'application/json', async () => ({ code: 503, result: { errorMessage: 'Down' } })));

    await expect(execute(createTask())).resolves.toMatchObject({ resultCode: 503 });
  });
});
