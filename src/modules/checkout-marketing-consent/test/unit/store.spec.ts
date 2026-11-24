import Vue from 'vue';
import Vuex from 'vuex';

import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import { consentModule } from '../../store';
import { CLEAR_SELECTION, HYDRATE_SELECTION, SAVE_SELECTION } from '../../types/store/actions';
import { GET_HYDRATED, GET_SELECTION } from '../../types/store/getters';
import { ConsentSelection } from '../../types/marketing-consent';

jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
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
});
