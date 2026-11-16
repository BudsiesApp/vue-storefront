import { TrafficAttributionModule } from '../../index';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';

jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({
  StorageManager: { init: jest.fn(), get: jest.fn(() => ({})) }
}));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true, default: { $on: jest.fn() }
}));
jest.mock('src/modules/shared', () => ({
  localStorageSynchronizationFactory: jest.fn(() => ({ setItems: jest.fn() }))
}));
jest.mock('../../helpers/cache-handler.factory', () => ({ cacheHandlerFactory: jest.fn() }));
jest.mock('../../helpers/get-local-storage-items.function', () => ({ getItemsFromStorageFactory: jest.fn() }));
jest.mock('../../store', () => ({ trafficAttributionStore: {} }));

it('synchronizes once on client initialization and reports only on cart events', async () => {
  const dispatch = jest.fn().mockResolvedValue(undefined);
  const store = { registerModule: jest.fn(), subscribe: jest.fn(), dispatch };
  const router = { currentRoute: { query: { 'm-message-click-id': 'synthetic' } } };
  (TrafficAttributionModule as any)({ store, router });
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(dispatch.mock.calls[0][1]).toBe(router);
  const callbacks = (EventBus.$on as jest.Mock).mock.calls;
  expect(callbacks.map(([event]) => event)).toEqual(['cart-created', 'cart-connected']);
  callbacks[0][1]();
  await Promise.resolve();
  expect(dispatch).toHaveBeenCalledTimes(2);
  expect(dispatch.mock.calls[1][0]).toBe('trafficAttribution/REPORT_TRAFFIC_ATTRIBUTION');
});

it('does not initialize capture or cart listeners on the server', () => {
  const helpers = require('@vue-storefront/core/helpers');
  helpers.isServer = true;
  (EventBus.$on as jest.Mock).mockClear();
  const store = { registerModule: jest.fn(), subscribe: jest.fn(), dispatch: jest.fn() };
  try {
    (TrafficAttributionModule as any)({ store, router: {} });
    expect(store.registerModule).toHaveBeenCalledTimes(1);
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(store.subscribe).not.toHaveBeenCalled();
    expect(EventBus.$on).not.toHaveBeenCalled();
  } finally {
    helpers.isServer = false;
  }
});
