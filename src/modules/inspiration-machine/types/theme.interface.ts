import { SelectableItem } from './selectable-item.interface';

export interface Theme {
  id: number,
  name: string,
  description: string,
  characters: SelectableItem[]
}
