import { NavigationItem } from './navigation-item.interface';

export interface NavigationColumn {
  title: string,
  classes: string[],
  items: NavigationItem[],
  maxRows: number
}
