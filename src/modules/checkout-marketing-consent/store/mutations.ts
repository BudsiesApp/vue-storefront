import { MutationTree } from 'vuex';

import { ConsentSelection } from '../types/marketing-consent';
import { SET_HYDRATED, SET_SELECTION } from '../types/store/mutations';
import { ConsentState } from '../types/store/state';

export const mutations: MutationTree<ConsentState> = {
  [SET_SELECTION] (state, selection: ConsentSelection | null) {
    state.selection = selection;
  },
  [SET_HYDRATED] (state) {
    state.hydrated = true;
  }
};
