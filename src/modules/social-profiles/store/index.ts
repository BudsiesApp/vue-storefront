import { Module } from 'vuex';
import { SocialProfile } from '../normalize';
import { actions } from './actions';
import { GET_PROFILES, SET_PROFILES } from '../types/Store';

export interface SocialProfilesState {
  profiles: SocialProfile[];
}

export const module: Module<SocialProfilesState, any> = {
  namespaced: true,
  state: () => ({ profiles: [] }),
  mutations: {
    [SET_PROFILES] (state, profiles: SocialProfile[]) {
      state.profiles = profiles;
    }
  },
  getters: {
    [GET_PROFILES]: state => state.profiles
  },
  actions
};
