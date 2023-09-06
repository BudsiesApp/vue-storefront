import { GetterTree } from 'vuex';

import RootState from 'core/types/RootState';

import { GET_CAMPAIGN_ID, GET_LANDING_PAGE } from '../types/getter';
import { StoreState } from '../types/store-state.interface';

export const getters: GetterTree<StoreState, RootState> = {
  [GET_CAMPAIGN_ID]: (state) => state.campaignId,
  [GET_LANDING_PAGE]: (state) => state.landingPage
}
