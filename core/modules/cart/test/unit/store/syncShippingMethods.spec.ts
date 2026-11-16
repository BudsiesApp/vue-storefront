import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import { CartService } from '@vue-storefront/core/data-resolver';
import cartMutations from '@vue-storefront/core/modules/cart/store/mutations';
import methodsActions from '@vue-storefront/core/modules/cart/store/actions/methodsActions';

jest.mock('@vue-storefront/core/store', () => ({ state: { config: {} } }));
jest.mock('config', () => ({}));
jest.mock('@vue-storefront/core/lib/multistore', () => ({
  currentStoreView: jest.fn(() => ({ tax: { defaultCountry: 'US' } }))
}));
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: {
    debug: jest.fn(() => () => {}),
    error: jest.fn(() => () => {})
  }
}));
jest.mock('@vue-storefront/core/helpers', () => ({ once: jest.fn() }));
jest.mock('@vue-storefront/core/modules/cart/helpers/productsEquals', () => jest.fn());
jest.mock('@vue-storefront/core/data-resolver', () => ({
  CartService: { getShippingMethods: jest.fn() }
}));
jest.mock('@vue-storefront/core/modules/cart/helpers', () => ({
  getAvailableShippingMethod: jest.requireActual('@vue-storefront/core/modules/cart/helpers/getAvailableShippingMethod').getAvailableShippingMethod
}));

Vue.use(Vuex);

interface Deferred<T> {
  promise: Promise<T>,
  resolve: (value: T) => void,
  reject: (reason: unknown) => void
}

function createDeferred<T> (): Deferred<T> {
  let resolveDeferred!: (value: T) => void;
  let rejectDeferred!: (reason: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolveDeferred = resolve;
    rejectDeferred = reject;
  });

  return { promise, resolve: resolveDeferred, reject: rejectDeferred };
}

const flatRate = { carrier_code: 'flatrate', method_code: 'flatrate', amount: 10 };
const freeShipping = { carrier_code: 'freeshipping', method_code: 'freeshipping', amount: 0 };

function createStore (): Store<any> {
  return new Vuex.Store({
    modules: {
      cart: {
        namespaced: true,
        state: {
          isShippingMethodsSyncing: false,
          isShippingMethodsSyncingError: false,
          shippingMethodsLookupId: 0
        },
        getters: {
          canUpdateMethods: () => true,
          isTotalsSyncRequired: () => false
        },
        mutations: cartMutations,
        actions: {
          syncShippingMethods: methodsActions.syncShippingMethods,
          updateShippingMethods: methodsActions.updateShippingMethods,
          clear: jest.fn()
        }
      },
      checkout: {
        namespaced: true,
        state: {
          shippingDetails: {
            country: 'US',
            zipCode: '10001',
            streetAddress: '1 Main St',
            shippingCarrier: flatRate.carrier_code,
            shippingMethod: flatRate.method_code
          },
          shippingMethods: [flatRate]
        },
        getters: {
          getShippingDetails: (state) => state.shippingDetails,
          getShippingMethods: (state) => state.shippingMethods
        },
        mutations: {
          setShippingMethods (state, shippingMethods) {
            state.shippingMethods = shippingMethods;
          },
          'checkout/UPDATE_PROP_VALUE' (state, [key, value]) {
            state.shippingDetails[key] = value;
          }
        },
        actions: {
          replaceShippingMethods ({ commit }, shippingMethods) {
            commit('setShippingMethods', shippingMethods);
          }
        }
      }
    }
  });
}

function syncShippingMethods (store: Store<any>): Promise<unknown> {
  return store.dispatch('cart/syncShippingMethods', { forceServerSync: true });
}

function getShippingMethodCodes (store: Store<any>): string[] {
  return store.state.checkout.shippingMethods.map((method) => method.method_code);
}

describe('Cart syncShippingMethods', () => {
  let store: Store<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createStore();
  });

  it('sends the checkout shipping address', async () => {
    (CartService.getShippingMethods as jest.Mock).mockResolvedValue({ resultCode: 200, result: [flatRate] });

    await syncShippingMethods(store);

    expect(CartService.getShippingMethods).toHaveBeenCalledWith(expect.objectContaining({
      countryId: 'US',
      postcode: '10001',
      street: ['1 Main St', undefined]
    }));
  });

  it('shows the loading state while the lookup is pending', async () => {
    const response = createDeferred<any>();
    (CartService.getShippingMethods as jest.Mock).mockReturnValue(response.promise);
    store.state.cart.isShippingMethodsSyncingError = true;

    const lookup = syncShippingMethods(store);

    expect(store.state.cart.isShippingMethodsSyncing).toBe(true);
    expect(store.state.cart.isShippingMethodsSyncingError).toBe(false);

    response.resolve({ resultCode: 200, result: [flatRate] });
    await lookup;

    expect(store.state.cart.isShippingMethodsSyncing).toBe(false);
  });

  it('keeps an available selected method after a successful lookup', async () => {
    (CartService.getShippingMethods as jest.Mock).mockResolvedValue({ resultCode: 200, result: [freeShipping, flatRate] });

    await syncShippingMethods(store);

    expect(getShippingMethodCodes(store)).toEqual(['freeshipping', 'flatrate']);
    expect(store.state.checkout.shippingDetails.shippingMethod).toBe('flatrate');
    expect(store.state.cart.isShippingMethodsSyncingError).toBe(false);
  });

  it('clears the selection after an empty successful lookup', async () => {
    (CartService.getShippingMethods as jest.Mock).mockResolvedValue({ resultCode: 200, result: [] });

    await syncShippingMethods(store);

    expect(getShippingMethodCodes(store)).toEqual([]);
    expect(store.state.checkout.shippingDetails.shippingMethod).toBe('');
    expect(store.state.checkout.shippingDetails.shippingCarrier).toBe('');
    expect(store.state.cart.isShippingMethodsSyncingError).toBe(false);
    expect(store.state.cart.isShippingMethodsSyncing).toBe(false);
  });

  it('sets the error and clears methods after an unsuccessful lookup', async () => {
    (CartService.getShippingMethods as jest.Mock).mockResolvedValue({ resultCode: 500, result: 'Server error' });

    await syncShippingMethods(store);

    expect(getShippingMethodCodes(store)).toEqual([]);
    expect(store.state.checkout.shippingDetails.shippingMethod).toBe('');
    expect(store.state.cart.isShippingMethodsSyncingError).toBe(true);
    expect(store.state.cart.isShippingMethodsSyncing).toBe(false);
  });

  it('sets the error, clears methods, and rethrows after a thrown lookup', async () => {
    (CartService.getShippingMethods as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(syncShippingMethods(store)).rejects.toThrow('Network error');

    expect(getShippingMethodCodes(store)).toEqual([]);
    expect(store.state.checkout.shippingDetails.shippingMethod).toBe('');
    expect(store.state.cart.isShippingMethodsSyncingError).toBe(true);
    expect(store.state.cart.isShippingMethodsSyncing).toBe(false);
  });

  it('clears the error after a successful retry', async () => {
    (CartService.getShippingMethods as jest.Mock)
      .mockResolvedValueOnce({ resultCode: 500, result: 'Server error' })
      .mockResolvedValueOnce({ resultCode: 200, result: [flatRate] });

    await syncShippingMethods(store);
    await syncShippingMethods(store);

    expect(getShippingMethodCodes(store)).toEqual(['flatrate']);
    expect(store.state.cart.isShippingMethodsSyncingError).toBe(false);
  });

  describe('overlapping lookups', () => {
    let earlierResponse: Deferred<any>;
    let laterResponse: Deferred<any>;
    let earlierLookup: Promise<unknown>;
    let laterLookup: Promise<unknown>;

    beforeEach(() => {
      earlierResponse = createDeferred<any>();
      laterResponse = createDeferred<any>();
      (CartService.getShippingMethods as jest.Mock)
        .mockReturnValueOnce(earlierResponse.promise)
        .mockReturnValueOnce(laterResponse.promise);

      earlierLookup = syncShippingMethods(store);
      laterLookup = syncShippingMethods(store);
    });

    it('ignores an earlier result that completes last', async () => {
      laterResponse.resolve({ resultCode: 200, result: [freeShipping] });
      await laterLookup;

      earlierResponse.resolve({ resultCode: 200, result: [flatRate] });
      await earlierLookup;

      expect(getShippingMethodCodes(store)).toEqual(['freeshipping']);
      expect(store.state.checkout.shippingDetails.shippingMethod).toBe('freeshipping');
      expect(store.state.cart.isShippingMethodsSyncing).toBe(false);
    });

    it('ignores an earlier failure that completes last', async () => {
      laterResponse.resolve({ resultCode: 200, result: [freeShipping] });
      await laterLookup;

      earlierResponse.reject(new Error('Network error'));
      await expect(earlierLookup).resolves.toBeUndefined();

      expect(getShippingMethodCodes(store)).toEqual(['freeshipping']);
      expect(store.state.cart.isShippingMethodsSyncingError).toBe(false);
    });

    it('keeps loading while the latest lookup is pending', async () => {
      earlierResponse.resolve({ resultCode: 500, result: 'Server error' });
      await earlierLookup;

      expect(store.state.cart.isShippingMethodsSyncing).toBe(true);
      expect(store.state.cart.isShippingMethodsSyncingError).toBe(false);
      expect(getShippingMethodCodes(store)).toEqual(['flatrate']);

      laterResponse.resolve({ resultCode: 200, result: [freeShipping] });
      await laterLookup;

      expect(store.state.cart.isShippingMethodsSyncing).toBe(false);
      expect(getShippingMethodCodes(store)).toEqual(['freeshipping']);
    });

    it('applies the latest failure', async () => {
      earlierResponse.resolve({ resultCode: 200, result: [flatRate] });
      await earlierLookup;

      laterResponse.reject(new Error('Network error'));
      await expect(laterLookup).rejects.toThrow('Network error');

      expect(getShippingMethodCodes(store)).toEqual([]);
      expect(store.state.cart.isShippingMethodsSyncingError).toBe(true);
      expect(store.state.cart.isShippingMethodsSyncing).toBe(false);
    });
  });
});
