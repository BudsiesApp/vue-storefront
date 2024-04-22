import { RawLocation } from 'vue-router';
import { NavigationColumn } from './navigation-column.interface';

export interface NavigationItem {
  url: string | RawLocation,
  title: string,
  items: NavigationColumn[],
  classes: string[]
}
