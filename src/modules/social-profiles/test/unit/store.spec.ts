import Vue from 'vue';
import Vuex from 'vuex';
import { TaskQueue } from '@vue-storefront/core/lib/sync';
import { Logger } from '@vue-storefront/core/lib/logger';
import { actions } from '../../store/actions';
import { module } from '../../store';
import {
  GET_SOCIAL_PROFILES_GETTER,
  LOAD_PROFILES,
  SET_PROFILES,
  SET_SOCIAL_PROFILES_MUTATION,
  SOCIAL_PROFILES_STORE
} from '../../types/Store';

jest.mock('config', () => ({ budsies: { endpoint: 'https://api.example/api/ext/budsies' } }));
jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: { execute: jest.fn() } }));
jest.mock('@vue-storefront/core/helpers', () => ({ processURLAddress: (url: string) => url }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));

describe('social profile loader', () => {
  const load = actions[LOAD_PROFILES] as Function;
  beforeEach(() => {
    jest.clearAllMocks();
    Vue.prototype.$cacheTags = new Set();
  });
  afterEach(() => {
    delete Vue.prototype.$cacheTags;
  });

  it.each([
    [[]],
    [[{
      id: 1,
      position: 0,
      network: 'x',
      profile_url: 'https://example.com',
      is_enabled: true,
      display_subscribers: true,
      subscribers_count: 1250
    }]]
  ])('loads and tags a response', async profiles => {
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 200, result: profiles });
    const commit = jest.fn();
    await load({ commit });
    expect(TaskQueue.execute).toHaveBeenCalledTimes(1);
    expect(TaskQueue.execute).toHaveBeenCalledWith({
      url: 'https://api.example/api/ext/budsies/social-profiles',
      payload: {
        headers: { Accept: 'application/json' },
        mode: 'cors',
        method: 'GET'
      },
      silent: true
    });
    expect(commit).toHaveBeenCalledWith(SET_PROFILES, profiles.length ? [{
      id: 1,
      position: 0,
      network: 'x',
      url: 'https://example.com',
      count: '1.2K'
    }] : []);
    expect(Vue.prototype.$cacheTags.has('social_profile')).toBe(true);
  });

  it.each([
    { resultCode: 500, result: [] },
    new Error('offline')
  ])('recovers from a failed response', async result => {
    if (result instanceof Error) {
      (TaskQueue.execute as jest.Mock).mockRejectedValue(result);
    } else {
      (TaskQueue.execute as jest.Mock).mockResolvedValue(result);
    }
    const commit = jest.fn();
    await expect(load({ commit })).resolves.toBeUndefined();
    expect(commit).toHaveBeenCalledWith(SET_PROFILES, []);
    expect(Vue.prototype.$cacheTags.has('no-cache')).toBe(true);
    expect(Logger.error).toHaveBeenCalled();
  });

  it('exposes the committed profiles through the namespaced getter', () => {
    Vue.use(Vuex);
    const store = new Vuex.Store({ modules: { [SOCIAL_PROFILES_STORE]: module } });
    const profiles = [{ id: 1, position: 0, network: 'x', url: 'https://example.com', count: null }];

    store.commit(SET_SOCIAL_PROFILES_MUTATION, profiles);

    expect(store.getters[GET_SOCIAL_PROFILES_GETTER]).toEqual(profiles);
  });
});
