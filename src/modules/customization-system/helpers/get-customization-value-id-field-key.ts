import { OptionData } from '../types/option-data.interface';
import { WidgetType } from '../types/widget-type';

export function getCustomizationValueIdFieldKey (
  customizationOptionData: OptionData
): 'id' | 'name' {
  return customizationOptionData.displayWidget === WidgetType.SEARCH_FIELD
    ? 'name'
    : 'id';
}
