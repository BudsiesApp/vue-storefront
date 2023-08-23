import { SelectableItem } from './selectable-item.interface';
import { Theme } from './theme.interface';

export interface StoreState {
  extras: SelectableItem[],
  themes: Theme[]
}
