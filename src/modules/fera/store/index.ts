import { Module } from 'vuex';

import RootState from '@vue-storefront/core/types/RootState';

import { actions } from './actions';
import { mutations } from './mutations';
import { FeraState, state } from './state';

export const feraStore: Module<FeraState, RootState> = {
  namespaced: true,
  state,
  actions,
  mutations
};
