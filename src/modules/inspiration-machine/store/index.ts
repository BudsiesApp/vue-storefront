import { Module } from 'vuex';
import RootState from '@vue-storefront/core/types/RootState';

import { mutations } from './mutations'
import { actions } from './actions'
import { state } from './state'
import { StoreState } from '../types/store-state.interface'
import { getters } from './getters'

export const inspirationMachineStore: Module<StoreState, RootState> = {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
