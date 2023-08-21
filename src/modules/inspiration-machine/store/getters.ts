import { GetterTree } from 'vuex';

import RootState from 'core/types/RootState';

import { GET_EXTRAS, GET_THEMES } from '../types/getter';
import { SelectableItem } from '../types/selectable-item.interface';
import { StoreState } from '../types/store-state.interface';
import { Theme } from '../types/theme.interface';

export const getters: GetterTree<StoreState, RootState> = {
  [GET_EXTRAS] (state): SelectableItem[] {
    return state.extras;
  },
  [GET_THEMES] (state): Theme[] {
    return state.themes;
  }
}
