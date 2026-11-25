import { TaskQueue } from '@vue-storefront/core/lib/sync';
import { actions } from '../../store/actions';
import { SUBMIT_SUBSCRIPTION } from '../../types/store/actions';

jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: { execute: jest.fn() } }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false, processURLAddress: (url: string) => url }));
jest.mock('config', () => ({ budsies: { endpoint: '/api/ext/budsies' } }));

describe('marketing subscription action', () => {
  const execute = TaskQueue.execute as jest.Mock;
  const action = actions[SUBMIT_SUBSCRIPTION] as Function;
  beforeEach(() => execute.mockReset());

  it('sends the request without a token', async () => {
    execute.mockResolvedValue({ resultCode: 200, result: false });
    const payload = { orderId: 123, email: 'test@example.com', emailConsent: true };
    expect(await action({}, payload)).toBe(false);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/ext/budsies/marketing-subscription-requests',
      payload: expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) })
    }));
  });

  it('rejects non-200 results', async () => {
    execute.mockResolvedValueOnce({ resultCode: 400, result: 'invalid' });
    await expect(action({}, {})).rejects.toThrow();
  });
});
