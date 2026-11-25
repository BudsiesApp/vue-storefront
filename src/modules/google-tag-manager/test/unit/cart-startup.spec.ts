import userActions from '@vue-storefront/core/modules/user/store/actions';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { LOCAL_CART_DATA_LOADED_EVENT } from '@vue-storefront/core/modules/cart';

jest.mock('config', () => ({}));
jest.mock('@vue-storefront/i18n', () => ({ __esModule: true, default: { t: (text: string) => text } }));
jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: {} }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: {} }));
jest.mock('@vue-storefront/core/data-resolver', () => ({ UserService: {} }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false, onlineHelper: {} }));
jest.mock('@vue-storefront/core/lib/modules', () => ({ isModuleRegistered: () => true }));
jest.mock('@vue-storefront/core/modules/cart', () => ({ LOCAL_CART_DATA_LOADED_EVENT: 'local-cart-data-loaded' }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({
  StorageManager: { get: () => ({ getItem: async () => null }) }
}));

it('includes the scheduled session synchronization in startup completion', async () => {
  let finishPull: () => void = () => undefined;
  const pull = new Promise<void>(resolve => { finishPull = resolve; });
  const context: any = {
    commit: jest.fn(),
    getters: { isLocalDataLoaded: false, getUserToken: null },
    rootGetters: { 'cart/isLocalDataLoaded': false },
    dispatch: jest.fn((action: string) => {
      if (action === 'sessionAfterStarted') return (userActions as any).sessionAfterStarted(context);
      if (action === 'cart/synchronizeCart') return pull;
      return Promise.resolve();
    })
  };
  let settled = false;
  const startup = (userActions as any).startSession(context).then(() => { settled = true; });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(settled).toBe(false);
  EventBus.$emit(LOCAL_CART_DATA_LOADED_EVENT);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(context.dispatch).toHaveBeenCalledWith('cart/synchronizeCart', undefined, { root: true });
  expect(settled).toBe(false);
  finishPull();
  await startup;
  expect(settled).toBe(true);
});
