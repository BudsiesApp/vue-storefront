import { Module } from 'vuex';
import RootState from '@vue-storefront/core/types/RootState';

import { mutations } from './mutations'
import { actions } from './actions'
import { state } from './state'
import { getters } from './getters'
import { StoreState } from '../types/store-state.interface';

export const persistedCustomerDataStore: Module<StoreState, RootState> = {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
