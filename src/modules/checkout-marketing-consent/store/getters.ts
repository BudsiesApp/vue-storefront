import { GetterTree } from 'vuex';

import RootState from '@vue-storefront/core/types/RootState';

import { ConsentState } from '../types/store/state';
import { GET_HYDRATED, GET_SELECTION } from '../types/store/getters';

export const getters: GetterTree<ConsentState, RootState> = {
  [GET_SELECTION] (state) {
    return state.selection;
  },
  [GET_HYDRATED] (state) {
    return state.hydrated;
  }
};
