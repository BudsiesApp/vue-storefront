import Vue from 'vue';
import { MutationTree } from 'vuex';

import { SET_CAMPAIGN_ID, SET_LANDING_PAGE } from '../types/mutation';
import { StoreState } from '../types/store-state.interface';

export const mutations: MutationTree<StoreState> = {
  [SET_CAMPAIGN_ID] (state, payload?: string) {
    Vue.set(state, 'campaignId', payload);
  },
  [SET_LANDING_PAGE] (state, payload?: string) {
    Vue.set(state, 'landingPage', payload);
  }
}
