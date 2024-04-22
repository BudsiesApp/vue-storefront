import ItemData from './item-data.interface';
import { NavigationItemData } from './navigation-item-data.interface';

export interface NavigationColumnData extends ItemData {
  title: string,
  items: NavigationItemData[]
}
