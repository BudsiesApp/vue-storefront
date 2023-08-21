import { MutationTree } from 'vuex';

import { SET_EXTRAS, SET_THEMES } from '../types/mutation';
import { SelectableItem } from '../types/selectable-item.interface';
import { StoreState } from '../types/store-state.interface';
import { Theme } from '../types/theme.interface';

export const mutations: MutationTree<StoreState> = {
  [SET_EXTRAS] (state, payload: SelectableItem[]): void {
    state.extras = payload;
  },
  [SET_THEMES] (state, payload: Theme[]): void {
    state.themes = payload;
  }
}
