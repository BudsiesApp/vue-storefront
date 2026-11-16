import { actions } from '../../store/actions';
import { state } from '../../store/state';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import Storage from '@vue-storefront/core/lib/store/storage';
import { SHIPPING_COUNTRY } from '../../types/local-storage-key';
import { SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY, SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED } from '../../types/mutation';

jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: () => () => {}, debug: () => () => {} } }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));

describe('persisted shipping country synchronization', () => {
  afterEach(() => jest.restoreAllMocks());

  it('starts unsettled on the server', () => {
    expect(state.shippingCountrySettled).toBe(false);
  });

  it.each(['FR', null])('settles %s before unrelated reads and ignores late results', async (country) => {
    let callback: (error: Error | null, value: string | null) => void;
    let resolveCountry: (value: string) => void;
    const pending = new Promise<string>((resolve) => { resolveCountry = resolve; });
    const getItem = jest.fn((key, cb) => {
      if (key === SHIPPING_COUNTRY) {
        callback = cb;
        return pending;
      }
      return new Promise(() => {});
    });
    jest.spyOn(StorageManager, 'get').mockReturnValue({ getItem } as any);
    const commit = jest.fn();
    (actions.synchronize as Function)({ commit });
    callback(null, country);
    await Promise.resolve();
    await Promise.resolve();
    expect(commit).toHaveBeenCalledWith(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, true);
    expect(commit.mock.calls.filter(([type]) => type === SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY)).toEqual(country ? [[SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY, country]] : []);
    resolveCountry('US');
    await Promise.resolve();
    expect(getItem.mock.calls.filter(([key]) => key === SHIPPING_COUNTRY)).toHaveLength(1);
    expect(commit.mock.calls.filter(([type]) => type === SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY)).toHaveLength(country ? 1 : 0);
  });

  it.each(['throw', 'reject'])('settles when the country read fails: %s', async (failure) => {
    const getItem = jest.fn((key) => {
      if (key !== SHIPPING_COUNTRY) return new Promise(() => {});
      if (failure === 'throw') throw new Error('storage unavailable');
      return Promise.reject(new Error('storage unavailable'));
    });
    jest.spyOn(StorageManager, 'get').mockReturnValue({ getItem } as any);
    const commit = jest.fn();
    (actions.synchronize as Function)({ commit });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(commit).toHaveBeenCalledWith(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, true);
    expect(commit).not.toHaveBeenCalledWith(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY, expect.anything());
  });

  it('settles using the real driver timeout even when its promise remains pending', async () => {
    jest.useFakeTimers();
    try {
      const collection = { _config: { name: 'timeout-test', storeName: 'timeout-test' }, ready: () => new Promise(() => {}) };
      const storage = new Storage(collection);
      jest.spyOn(storage, 'recreateDb').mockImplementation(() => {});
      jest.spyOn(StorageManager, 'get').mockReturnValue(storage);
      const commit = jest.fn();
      (actions.synchronize as Function)({ commit });
      jest.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
      expect(commit).toHaveBeenCalledWith(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, true);
      expect(commit).not.toHaveBeenCalledWith(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY, expect.anything());
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(['email', 'first-name', 'last-name', 'phone-number', 'vat-id', 'customer-email'])('settles country before a failure reading %s', async (blockedKey) => {
    const getItem = jest.fn((key, callback) => {
      if (key === SHIPPING_COUNTRY) {
        callback(null, 'FR');
        return Promise.resolve('FR');
      }
      return key === blockedKey ? Promise.reject(new Error('unrelated read failed')) : Promise.resolve(null);
    });
    jest.spyOn(StorageManager, 'get').mockReturnValue({ getItem } as any);
    const commit = jest.fn();
    await expect((actions.synchronize as Function)({ commit })).rejects.toThrow('unrelated read failed');
    expect(commit.mock.calls.slice(0, 2)).toEqual([
      [SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY, 'FR'],
      [SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, true]
    ]);
    expect(getItem.mock.calls.filter(([key]) => key === SHIPPING_COUNTRY)).toHaveLength(1);
  });

  it.each(['email', 'first-name', 'last-name', 'phone-number', 'vat-id', 'customer-email'])('settles country while %s remains pending', async (blockedKey) => {
    const getItem = jest.fn((key, callback) => {
      if (key === SHIPPING_COUNTRY) {
        callback(null, 'FR');
        return Promise.resolve('FR');
      }
      return key === blockedKey ? new Promise(() => {}) : Promise.resolve(null);
    });
    jest.spyOn(StorageManager, 'get').mockReturnValue({ getItem } as any);
    const commit = jest.fn();
    (actions.synchronize as Function)({ commit });
    for (let i = 0; i < 15; i++) await Promise.resolve();
    expect(getItem).toHaveBeenCalledWith(blockedKey);
    expect(commit).toHaveBeenCalledWith(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, true);
    expect(getItem.mock.calls.filter(([key]) => key === SHIPPING_COUNTRY)).toHaveLength(1);
  });
});
