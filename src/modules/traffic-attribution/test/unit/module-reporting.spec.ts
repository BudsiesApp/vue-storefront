import { TrafficAttributionModule } from '../../index';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { Logger } from '@vue-storefront/core/lib/logger';

jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { init: jest.fn(), get: jest.fn() } }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true, default: { $on: jest.fn() }
}));
jest.mock('src/modules/shared', () => ({ localStorageSynchronizationFactory: () => ({ setItems: jest.fn() }) }));
jest.mock('../../store', () => ({ trafficAttributionStore: {} }));
jest.mock('../../helpers/get-local-storage-items.function', () => ({ getItemsFromStorageFactory: jest.fn() }));

it.each(['cart-created', 'cart-connected'])('keeps %s nonblocking when reporting fails', async event => {
  const store = {
    registerModule: jest.fn(), subscribe: jest.fn(),
    dispatch: jest.fn((action: string) => action.endsWith('SYNCHRONIZE')
      ? Promise.resolve() : Promise.reject(new Error('synthetic-secret')))
  };
  (EventBus.$on as jest.Mock).mockClear();
  (Logger.error as jest.Mock).mockClear();
  TrafficAttributionModule({ store, router: {} } as any);
  const handler = (EventBus.$on as jest.Mock).mock.calls.find(call => call[0] === event)[1];
  expect(handler()).toBeUndefined();
  await Promise.resolve();
  expect(Logger.error).toHaveBeenCalledWith('Error reporting traffic attribution', expect.any(String));
  expect(JSON.stringify((Logger.error as jest.Mock).mock.calls)).not.toContain('synthetic-secret');
});
