import { GetterTree } from 'vuex';
import RootState from '@vue-storefront/core/types/RootState'

import { StoreState } from '../types/store-state.interface';
import { GET_REFERRER_TOKEN } from '../types/getter';

export const getters: GetterTree<StoreState, RootState> = {
  [GET_REFERRER_TOKEN] (state): string | undefined {
    return state.referrerCode;
  }
}
