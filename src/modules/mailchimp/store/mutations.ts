import Vue from 'vue';
import { MutationTree } from 'vuex';

import { SET_CAMPAIGN_ID, SET_LANDING_PAGE } from '../types/mutation';
import { StoreState } from '../types/store-state.interface';

export const mutations: MutationTree<StoreState> = {
  [SET_CAMPAIGN_ID] (
    state,
    value
  ) {
    Vue.set(state, 'campaignId', value);
  },
  [SET_LANDING_PAGE] (
    state,
    value
  ) {
    Vue.set(state, 'landingPage', value);
  }
}
