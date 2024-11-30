import { NavigationColumn } from './navigation-column.interface';
import { NavigationItemData } from './navigation-item-data.interface';

export interface NavigationItem extends NavigationItemData {
  items: NavigationColumn[]
}
