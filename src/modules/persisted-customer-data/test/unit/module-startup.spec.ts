import { PersistedCustomerDataModule } from '../../index';

const mockInit = jest.fn();
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { init: () => mockInit() } }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: () => () => {} } }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({ __esModule: true, default: { $on: jest.fn(), $emit: jest.fn() } }));
jest.mock('src/modules/shared', () => ({ localStorageSynchronizationFactory: () => ({ setItems: jest.fn() }), UserEvents: {} }));
jest.mock('../../store', () => ({ persistedCustomerDataStore: {} }));
jest.mock('../../helpers/get-local-storage-items.function', () => ({}));
jest.mock('../../helpers/cache-handler.factory', () => ({ cacheHandlerFactory: () => jest.fn() }));
jest.mock('../../helpers/register-window-customer-data-updater.function', () => ({ registerWindowCustomerDataUpdater: jest.fn() }));
jest.mock('../../composables/use-persisted-email', () => ({}));
jest.mock('../../composables/use-persisted-customer-phone-number', () => ({}));
jest.mock('../../composables/use-persisted-first-name', () => ({}));
jest.mock('../../composables/use-persisted-last-name', () => ({}));
jest.mock('../../composables/use-persisted-shipping-country', () => ({}));
jest.mock('../../composables/use-persisted-vat-id', () => ({}));

it('publishes settlement when startup storage initialization throws', async () => {
  mockInit.mockImplementation(() => { throw new Error('unavailable'); });
  const store = { registerModule: jest.fn(), commit: jest.fn(), subscribe: jest.fn(), dispatch: jest.fn(), watch: jest.fn(), getters: {} };
  await (PersistedCustomerDataModule as Function)({ store });
  expect(store.registerModule).toHaveBeenCalled();
  expect(store.commit).toHaveBeenCalledWith(expect.stringContaining('SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED'), true);
  expect(store.dispatch).not.toHaveBeenCalled();
  expect(store.subscribe).not.toHaveBeenCalled();
});
