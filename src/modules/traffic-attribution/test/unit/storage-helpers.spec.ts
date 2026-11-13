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
import { mutations } from '../../store/mutations';
import Vue from 'vue';
import Vuex from 'vuex';

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
    isSent: false,
    createdAt: 1000,
    expiresAt: 2000
  };
}

describe('traffic attribution storage helpers', () => {
  it('persists set and sent-flag mutations for first and last touch', () => {
    const firstTouch = createTouch();
    const lastTouch = {
      ...createTouch(),
      isSent: true
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
      [MODULE_NAME]: { firstTouch: { ...firstTouch, isSent: true }, lastTouch: null }
    } as any);
    handleCacheMutation({ type: `${MODULE_NAME}/${SET_LAST_TOUCH}`, payload: lastTouch }, {
      [MODULE_NAME]: { firstTouch, lastTouch }
    } as any);
    handleCacheMutation({ type: `${MODULE_NAME}/${MARK_LAST_TOUCH_SENT}`, payload: undefined }, {
      [MODULE_NAME]: { firstTouch, lastTouch }
    } as any);

    expect(storage.setItem).toHaveBeenCalledWith(FIRST_TOUCH, firstTouch);
    expect(storage.setItem).toHaveBeenCalledWith(FIRST_TOUCH, { ...firstTouch, isSent: true });
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
        query_params: { gclid: 'last-click-id' }
      }
    };
    const store = {
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

  it('cleans an older touch through the real storage-event and mutation path', () => {
    Vue.use(Vuex);
    const store = new Vuex.Store<any>({
      modules: { [MODULE_NAME]: { namespaced: true, state: { firstTouch: null }, mutations } }
    });
    const touch = createTouch();
    touch.attribution.query_params.password = 'synthetic';
    touch.attribution.query_params['direct-crm-ticket'] = 'synthetic-two';
    getItemsFromStorageFactory(store as any)(new StorageEvent('storage', {
      key: `shop/${MODULE_NAME}/${FIRST_TOUCH}`, newValue: JSON.stringify(touch)
    }));
    expect(store.state[MODULE_NAME].firstTouch.attribution.query_params).toEqual({ gclid: 'click-id' });
  });

  it.each(['password', 'direct-crm-ticket'])('persists bounded URL copies after cross-tab commits for %s', name => {
    Vue.use(Vuex);
    const storage = { setItem: jest.fn().mockResolvedValue(undefined), removeItem: jest.fn() };
    const store = new Vuex.Store<any>({
      modules: { [MODULE_NAME]: { namespaced: true, state: { firstTouch: null, lastTouch: null }, mutations } }
    });
    store.subscribe(cacheHandlerFactory(storage as any));
    const touch = createTouch();
    const ambiguous = `https://example.test/page?utm_source=allowed#route=one?${name}=synthetic&keep=x`;
    const route = `https://example.test/#/page=one?${name}=synthetic&keep=a%2Bb`;
    touch.attribution.landing_page_url = ambiguous;
    touch.attribution.referrer_url = route;
    touch.attribution.query_params[name] = 'synthetic';
    for (const key of [FIRST_TOUCH, LAST_TOUCH]) {
      getItemsFromStorageFactory(store as any)(new StorageEvent('storage', {
        key: `shop/${MODULE_NAME}/${key}`, newValue: JSON.stringify(touch)
      }));
    }
    store.commit(`${MODULE_NAME}/${MARK_FIRST_TOUCH_SENT}`);
    store.commit(`${MODULE_NAME}/${MARK_LAST_TOUCH_SENT}`);
    for (const [, persisted] of storage.setItem.mock.calls) {
      expect(persisted.attribution.landing_page_url).toBe(ambiguous);
      expect(persisted.attribution.referrer_url).toBe('https://example.test/#/page=one?keep=a%2Bb');
      expect(persisted.attribution.query_params).toEqual({ gclid: 'click-id' });
      expect(persisted).toMatchObject({ createdAt: 1000, expiresAt: 2000 });
    }
    expect(storage.setItem).toHaveBeenCalledTimes(4);
    expect(store.state[MODULE_NAME].firstTouch.isSent).toBe(true);
    expect(store.state[MODULE_NAME].lastTouch.isSent).toBe(true);
    expect(touch.attribution.referrer_url).toBe(route);
  });

  it('clears Vuex state when storage events remove touches', () => {
    const store = {
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
});
