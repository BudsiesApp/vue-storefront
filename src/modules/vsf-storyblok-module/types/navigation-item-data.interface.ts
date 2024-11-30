import ItemData from './item-data.interface';
import LinkField from './link-field.interface';
import { NavigationColumnData } from './navigation-column-data.interface';

export interface NavigationItemData extends ItemData {
  link_text: string,
  link_url: LinkField,
  sub_items: NavigationColumnData[]
}
