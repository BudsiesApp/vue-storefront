import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';

import { CheckoutMarketingConsentModule } from '../../index';

jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true,
  default: { $on: jest.fn() }
}));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: { execute: jest.fn() } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { init: jest.fn() } }));

describe('checkout consent lifecycle', () => {
  it('clears the selection after orders and logout without Contact', () => {
    const store = {
      registerModule: jest.fn(),
      dispatch: jest.fn()
    };

    CheckoutMarketingConsentModule({ store } as any);

    expect(store.dispatch).toHaveBeenCalledWith('checkoutMarketingConsent/HYDRATE_SELECTION');

    const listeners = (EventBus.$on as jest.Mock).mock.calls;

    for (const event of ['order-after-placed', 'user-after-logout']) {
      const listener = listeners.find((call) => call[0] === event)[1];

      listener();
    }

    const clearCalls = store.dispatch.mock.calls.filter((call) => {
      return call[0] === 'checkoutMarketingConsent/CLEAR_SELECTION';
    });

    expect(clearCalls).toHaveLength(2);
  });
});
