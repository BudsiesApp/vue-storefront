import Vue from 'vue';
import config from 'config';
import { ActionTree } from 'vuex';
import RootState from '@vue-storefront/core/types/RootState';
import { TaskQueue } from '@vue-storefront/core/lib/sync';
import { processURLAddress } from '@vue-storefront/core/helpers';
import { Logger } from '@vue-storefront/core/lib/logger';
import { normalizeSocialProfiles } from '../normalize';
import { LOAD_PROFILES, SET_PROFILES, SOCIAL_PROFILES_STORE } from '../types/Store';
import type { SocialProfilesState } from './index';

export const actions: ActionTree<SocialProfilesState, RootState> = {
  async [LOAD_PROFILES] ({ commit }): Promise<void> {
    try {
      const url = processURLAddress(`${config.budsies.endpoint}/social-profiles`);
      const task = await TaskQueue.execute({
        url,
        payload: {
          headers: { Accept: 'application/json' },
          mode: 'cors',
          method: 'GET'
        },
        silent: true
      });
      if (Number(task.resultCode) !== 200) {
        throw new Error('Invalid social profile response');
      }
      commit(SET_PROFILES, normalizeSocialProfiles(task.result));
      if (Vue.prototype.$cacheTags) {
        Vue.prototype.$cacheTags.add('social_profile');
      }
    } catch (error) {
      commit(SET_PROFILES, []);
      if (Vue.prototype.$cacheTags) {
        Vue.prototype.$cacheTags.add('no-cache');
      }
      Logger.error(error, SOCIAL_PROFILES_STORE)();
    }
  }
};
