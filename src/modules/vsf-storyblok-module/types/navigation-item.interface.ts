import { RawLocation } from 'vue-router';
import { NavigationItemData } from './navigation-item-data.interface';

export type NavigationItem = Pick<NavigationItemData, 'link_text' | 'sub_items'> & {
  classes: string[],
  url: string | RawLocation
}
