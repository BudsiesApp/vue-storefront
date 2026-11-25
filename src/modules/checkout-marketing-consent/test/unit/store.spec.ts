import Vue from 'vue';
import Vuex from 'vuex';

import { Logger } from '@vue-storefront/core/lib/logger';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import { consentModule } from '../../store';
import { CLEAR_SELECTION, HYDRATE_SELECTION, SAVE_SELECTION } from '../../types/store/actions';
import { GET_HYDRATED, GET_SELECTION } from '../../types/store/getters';
import { ConsentSelection } from '../../types/marketing-consent';

jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: { execute: jest.fn() } }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));

Vue.use(Vuex);

describe('consent selection storage', () => {
  it('saves, restores and clears the selection independently', async () => {
    const selection: ConsentSelection = {
      email: 'test@example.com',
      emailConsent: true,
      smsConsent: false,
      phone: '+14165550123'
    };
    let saved: ConsentSelection | null = null;

    jest.spyOn(StorageManager, 'get').mockReturnValue({
      getItem: jest.fn(async () => saved),
      setItem: jest.fn(async (_, value) => {
        saved = value;
      }),
      removeItem: jest.fn(async () => {
        saved = null;
      })
    } as any);

    const store = new Vuex.Store({ modules: { consent: consentModule } });

    await store.dispatch(`consent/${SAVE_SELECTION}`, selection);
    await store.dispatch(`consent/${HYDRATE_SELECTION}`);

    expect(store.getters[`consent/${GET_SELECTION}`]).toEqual(selection);
    expect(store.getters[`consent/${GET_HYDRATED}`]).toBe(true);

    await store.dispatch(`consent/${CLEAR_SELECTION}`);

    expect(store.getters[`consent/${GET_SELECTION}`]).toBeNull();
    expect(saved).toBeNull();

    jest.restoreAllMocks();
  });

  describe('failing or hanging storage', () => {
    const selection: ConsentSelection = {
      email: 'test@example.com',
      emailConsent: true,
      smsConsent: false,
      phone: ''
    };

    function mockWrite (write: () => Promise<void>) {
      jest.spyOn(StorageManager, 'get').mockReturnValue({
        setItem: jest.fn(write),
        removeItem: jest.fn(write)
      } as any);
    }

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('keeps the selection in state and logs a rejected write', async () => {
      mockWrite(() => Promise.reject(new Error('storage failed')));

      const store = new Vuex.Store({ modules: { consent: consentModule } });

      await store.dispatch(`consent/${SAVE_SELECTION}`, selection);
      await Promise.resolve();

      expect(store.getters[`consent/${GET_SELECTION}`]).toEqual(selection);
      expect(Logger.error).toHaveBeenCalledTimes(1);

      await store.dispatch(`consent/${CLEAR_SELECTION}`);
      await Promise.resolve();

      expect(store.getters[`consent/${GET_SELECTION}`]).toBeNull();
      expect(Logger.error).toHaveBeenCalledTimes(2);
    });

    it('does not wait for a write that never settles', async () => {
      mockWrite(() => new Promise<void>(() => undefined));

      const store = new Vuex.Store({ modules: { consent: consentModule } });

      await store.dispatch(`consent/${SAVE_SELECTION}`, selection);

      expect(store.getters[`consent/${GET_SELECTION}`]).toEqual(selection);
    });
  });
});
