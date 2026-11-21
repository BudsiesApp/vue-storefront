import { mutations } from '../../store/mutations';
import { cacheHandlerFactory } from '../../helpers/cache-handler.factory';
import { getItemsFromStorageFactory } from '../../helpers/get-local-storage-items.function';
import { FIRST_TOUCH, LAST_TOUCH } from '../../types/local-storage-key';
import {
  SET_FIRST_TOUCH,
  SET_LAST_TOUCH,
  MARK_FIRST_TOUCH_SENT,
  MARK_LAST_TOUCH_SENT,
  CLEAR_FIRST_TOUCH,
  CLEAR_LAST_TOUCH
} from '../../types/mutations';
import { MODULE_NAME } from '../../types/store-name';
import { TouchData } from '../../types/traffic-attribution.interface';

jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: {
    error: jest.fn(() => jest.fn())
  }
}));

jest.mock('src/modules/shared', () => ({
  parseLocalStorageValue: jest.fn((rawValue?: string) => {
    if (!rawValue) {
      return undefined;
    }

    return JSON.parse(rawValue);
  })
}));

jest.mock('src/modules/shared/helpers/check-multi-store-local-storage-key.function', () => ({
  checkMultiStoreLocalStorageKey: jest.fn((key: string, path: string) => key === `shop/${path}`)
}));

function createTouch (): TouchData {
  return {
    attribution: {
      landing_page_url: 'http://localhost/landing',
      query_params: { gclid: 'click-id' },
      detected_at: '2026-06-06T00:00:00.000Z'
    },
    createdAt: 1000,
    expiresAt: 2000
  };
}

describe('traffic attribution storage helpers', () => {
  it('persists set and sent-flag mutations for first and last touch', () => {
    const firstTouch = createTouch();
    const lastTouch = {
      ...createTouch(),
      deliveredCartId: 'A'
    };
    const storage = {
      setItem: jest.fn(() => Promise.resolve()),
      removeItem: jest.fn(() => Promise.resolve())
    };
    const handleCacheMutation = cacheHandlerFactory(storage as any);

    handleCacheMutation({ type: `${MODULE_NAME}/${SET_FIRST_TOUCH}`, payload: firstTouch }, {
      [MODULE_NAME]: { firstTouch, lastTouch: null }
    } as any);
    handleCacheMutation({ type: `${MODULE_NAME}/${MARK_FIRST_TOUCH_SENT}`, payload: undefined }, {
      [MODULE_NAME]: { firstTouch: { ...firstTouch, deliveredCartId: 'A' }, lastTouch: null }
    } as any);
    handleCacheMutation({ type: `${MODULE_NAME}/${SET_LAST_TOUCH}`, payload: lastTouch }, {
      [MODULE_NAME]: { firstTouch, lastTouch }
    } as any);
    handleCacheMutation({ type: `${MODULE_NAME}/${MARK_LAST_TOUCH_SENT}`, payload: undefined }, {
      [MODULE_NAME]: { firstTouch, lastTouch }
    } as any);

    expect(storage.setItem).toHaveBeenCalledWith(FIRST_TOUCH, firstTouch);
    expect(storage.setItem).toHaveBeenCalledWith(FIRST_TOUCH, { ...firstTouch, deliveredCartId: 'A' });
    expect(storage.setItem).toHaveBeenCalledWith(LAST_TOUCH, lastTouch);
    expect(storage.setItem).toHaveBeenCalledWith(LAST_TOUCH, lastTouch);
  });

  it('removes stored touches for clear mutations', () => {
    const storage = {
      setItem: jest.fn(() => Promise.resolve()),
      removeItem: jest.fn(() => Promise.resolve())
    };
    const handleCacheMutation = cacheHandlerFactory(storage as any);

    handleCacheMutation({ type: `${MODULE_NAME}/${CLEAR_FIRST_TOUCH}`, payload: undefined }, {
      [MODULE_NAME]: { firstTouch: null, lastTouch: null }
    } as any);
    handleCacheMutation({ type: `${MODULE_NAME}/${CLEAR_LAST_TOUCH}`, payload: undefined }, {
      [MODULE_NAME]: { firstTouch: null, lastTouch: null }
    } as any);

    expect(storage.removeItem).toHaveBeenCalledWith(FIRST_TOUCH);
    expect(storage.removeItem).toHaveBeenCalledWith(LAST_TOUCH);
  });

  it('synchronizes first and last touch storage events into Vuex state', () => {
    const firstTouch = createTouch();
    const lastTouch = {
      ...createTouch(),
      attribution: {
        ...createTouch().attribution,
        query_params: { gclid: 'last-click-id', password: 'synthetic', 'direct-crm-ticket': 'example' }
      }
    };
    const store = {
      state: {},
      commit: jest.fn()
    };
    const handleStorageEvent = getItemsFromStorageFactory(store as any);

    const firstTouchEvent = {
      key: `shop/${MODULE_NAME}/${FIRST_TOUCH}`,
      newValue: JSON.stringify(firstTouch)
    };
    const lastTouchEvent = {
      key: `shop/${MODULE_NAME}/${LAST_TOUCH}`,
      newValue: JSON.stringify(lastTouch)
    };

    handleStorageEvent(firstTouchEvent as StorageEvent);
    handleStorageEvent(lastTouchEvent as StorageEvent);

    expect(store.commit).toHaveBeenCalledWith(`${MODULE_NAME}/${SET_FIRST_TOUCH}`, firstTouch);
    expect(store.commit).toHaveBeenCalledWith(`${MODULE_NAME}/${SET_LAST_TOUCH}`, lastTouch);
  });

  it('clears Vuex state when storage events remove touches', () => {
    const store = {
      state: {},
      commit: jest.fn()
    };
    const handleStorageEvent = getItemsFromStorageFactory(store as any);

    const firstTouchEvent = {
      key: `shop/${MODULE_NAME}/${FIRST_TOUCH}`,
      newValue: null
    };
    const lastTouchEvent = {
      key: `shop/${MODULE_NAME}/${LAST_TOUCH}`,
      newValue: null
    };

    handleStorageEvent(firstTouchEvent as StorageEvent);
    handleStorageEvent(lastTouchEvent as StorageEvent);

    expect(store.commit).toHaveBeenCalledWith(`${MODULE_NAME}/${CLEAR_FIRST_TOUCH}`);
    expect(store.commit).toHaveBeenCalledWith(`${MODULE_NAME}/${CLEAR_LAST_TOUCH}`);
  });
  it.each([undefined, '', 1, false, 'A'])('normalizes stored delivery id %s and protects attribution', (id) => {
    for (const type of [SET_FIRST_TOUCH, SET_LAST_TOUCH]) {
      const state = { firstTouch: null, lastTouch: null } as any;
      const touch = { ...createTouch(), isSent: true, deliveredCartId: id };
      mutations[type](state, touch);
      const normalized = type === SET_FIRST_TOUCH ? state.firstTouch : state.lastTouch;
      expect(normalized).not.toHaveProperty('isSent');
      expect(normalized.deliveredCartId).toBe(id === 'A' ? 'A' : undefined);
      expect(normalized.attribution).toBe(touch.attribution);
      expect(normalized.createdAt).toBe(touch.createdAt);
      expect(normalized.expiresAt).toBe(touch.expiresAt);
    }
  });

  it('marks and persists only the matching first touch', () => {
    const state = { firstTouch: createTouch(), lastTouch: { ...createTouch(), deliveredCartId: 'A' } };
    mutations[MARK_FIRST_TOUCH_SENT](state, { createdAt: 999, cartId: 'A' });
    expect(state.firstTouch.deliveredCartId).toBeUndefined();
    expect(state.lastTouch.deliveredCartId).toBe('A');
    mutations[MARK_FIRST_TOUCH_SENT](state, { createdAt: 1000, cartId: 'A' });
    expect(state.firstTouch.deliveredCartId).toBe('A');
    expect(state.lastTouch.deliveredCartId).toBe('A');
    const storage = { setItem: jest.fn().mockResolvedValue(undefined) };
    cacheHandlerFactory(storage as any)({ type: MARK_FIRST_TOUCH_SENT }, { [MODULE_NAME]: state } as any);
    expect(storage.setItem).toHaveBeenCalledWith(FIRST_TOUCH, state.firstTouch);
    expect(storage.setItem).not.toHaveBeenCalledWith(LAST_TOUCH, expect.anything());
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const restored = { firstTouch: null, lastTouch: null };
    mutations[SET_FIRST_TOUCH](restored, JSON.parse(JSON.stringify(state.firstTouch)));
    expect((restored.firstTouch as TouchData).deliveredCartId).toBe('A');
    mutations[MARK_LAST_TOUCH_SENT](state, { createdAt: 999, cartId: 'B' });
    expect(state.lastTouch.deliveredCartId).toBe('A');
    const missing = { firstTouch: null, lastTouch: state.lastTouch };
    mutations[MARK_FIRST_TOUCH_SENT](missing, { createdAt: 1000, cartId: 'A' });
    expect(missing).toEqual({ firstTouch: null, lastTouch: state.lastTouch });
  });

  it.each([FIRST_TOUCH, LAST_TOUCH])('orders storage imports for %s', (key) => {
    const field = key === FIRST_TOUCH ? 'firstTouch' : 'lastTouch';
    const current = { ...createTouch(), deliveredCartId: 'A' };
    const state = { firstTouch: null, lastTouch: null, [field]: current } as any;
    const store = {
      state: { [MODULE_NAME]: state },
      commit: jest.fn((type, payload) => mutations[type.split('/').pop()](state, payload))
    };
    const handler = getItemsFromStorageFactory(store as any);
    for (const createdAt of [999, 1000, 1001]) {
      store.commit.mockClear();
      const incoming = { ...createTouch(), createdAt, isSent: true, deliveredCartId: 'B' };
      const event: Partial<StorageEvent> = { key: `shop/${MODULE_NAME}/${key}`, newValue: JSON.stringify(incoming) };
      handler(event as StorageEvent);
      expect(store.commit).toHaveBeenCalledTimes(createdAt < 1000 ? 0 : 1);
      expect(state[field]).toEqual(createdAt < 1000 ? current : { ...createTouch(), createdAt, deliveredCartId: 'B' });
      expect(state[field]).not.toHaveProperty('isSent');
    }
  });
});
