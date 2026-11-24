import { Module } from 'vuex';

import RootState from '@vue-storefront/core/types/RootState';

import { ConsentState } from '../types/store/state';
import { actions } from './actions';
import { getters } from './getters';
import { mutations } from './mutations';
import { state } from './state';

export const consentModule: Module<ConsentState, RootState> = {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
