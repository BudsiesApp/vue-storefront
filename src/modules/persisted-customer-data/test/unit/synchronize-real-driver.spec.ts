import { SHIPPING_COUNTRY } from '../../types/local-storage-key';
import { SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY, SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED } from '../../types/mutation';
import { SN_PERSISTED_CUSTOMER_DATA } from '../../types/store-name';

jest.mock('config', () => ({
  storeViews: { commonCache: false },
  localForage: { defaultDrivers: {} }
}));
jest.mock('@vue-storefront/core/lib/multistore', () => ({ currentStoreView: () => null }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/lib/logger', () => {
  const noop = () => () => {};
  return { Logger: { error: noop, debug: noop, log: noop, warn: noop, info: noop } };
});
// The namespace import in storage-manager.ts drops localForage's prototype methods under ts-jest,
// so expose the real instance's API explicitly; the driver behind it stays the real localForage.
jest.mock('localforage', () => {
  const localForage = jest.requireActual('localforage');
  const unusedMethod = () => Promise.resolve(null);
  const driverFor = (name: string, initStorage: () => Promise<void>) => ({
    _driver: name,
    _initStorage: initStorage,
    _support: true,
    iterate: unusedMethod,
    getItem: unusedMethod,
    setItem: unusedMethod,
    removeItem: unusedMethod,
    clear: unusedMethod,
    length: unusedMethod,
    key: unusedMethod,
    keys: unusedMethod
  });
  localForage.defineDriver(driverFor('rejectingDriver', () => Promise.reject(new Error('driver init failed'))));
  localForage.defineDriver(driverFor('hangingDriver', () => new Promise(() => {})));
  return {
    createInstance: (options) => localForage.createInstance(options),
    LOCALSTORAGE: localForage.LOCALSTORAGE,
    REJECTING: 'rejectingDriver',
    HANGING: 'hangingDriver'
  };
});

interface Loaded {
  StorageManager: any,
  actions: any
}

function loadModules (driver?: 'REJECTING' | 'HANGING', unavailableLocalStorage = false): Loaded {
  let loaded: Loaded;
  jest.isolateModules(() => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    if (unavailableLocalStorage) {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get () { throw new Error('SecurityError'); }
      });
    }
    try {
      // localForage evaluates localStorage support while it is first loaded.
      require('localforage');
      if (driver) {
        require('config').localForage.defaultDrivers[SN_PERSISTED_CUSTOMER_DATA] = driver;
      }
      loaded = {
        StorageManager: require('@vue-storefront/core/lib/storage-manager').StorageManager,
        actions: require('../../store/actions').actions
      };
    } finally {
      if (unavailableLocalStorage) {
        delete (window as any).localStorage;
        if (original) Object.defineProperty(window, 'localStorage', original);
      }
    }
  });
  return loaded;
}

async function flush () {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

describe('persisted shipping country synchronization with the real storage driver', () => {
  afterEach(() => jest.useRealTimers());

  it.each([
    ['saved storage is unsupported', undefined, true],
    ['driver initialization rejects', 'REJECTING', false]
  ] as const)('acquires storage and settles when %s', async (_, driver, unavailableLocalStorage) => {
    const { StorageManager, actions } = loadModules(driver, unavailableLocalStorage);

    expect(() => StorageManager.init(SN_PERSISTED_CUSTOMER_DATA)).not.toThrow();
    expect(() => StorageManager.get(SN_PERSISTED_CUSTOMER_DATA)).not.toThrow();
    await expect(StorageManager.get(SN_PERSISTED_CUSTOMER_DATA).getItem(SHIPPING_COUNTRY)).rejects.toThrow();

    const commit = jest.fn();
    const synchronization = actions.synchronize({ commit });
    const unrelatedFailure = expect(synchronization).rejects.toThrow();
    await flush();

    expect(commit).toHaveBeenCalledWith(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, true);
    expect(commit).not.toHaveBeenCalledWith(SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY, expect.anything());
    // Unrelated field reads still surface their errors after country has settled.
    await unrelatedFailure;
  });

  it('settles at the driver callback timeout when saved storage never becomes ready', async () => {
    const { StorageManager, actions } = loadModules('HANGING');
    StorageManager.init(SN_PERSISTED_CUSTOMER_DATA);
    jest.useFakeTimers();

    const commit = jest.fn();
    actions.synchronize({ commit });
    await flush();
    jest.advanceTimersByTime(799);
    await flush();
    expect(commit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await flush();
    expect(commit.mock.calls).toEqual([[SET_PERSISTED_CUSTOMER_SHIPPING_COUNTRY_SETTLED, true]]);
  });
});
