import { Customization } from '../types/customization.interface';
import { WidgetType } from '../types/widget-type';

const widgetTypesCanSelectMultipleOptionValues = [
  WidgetType.CARDS_LIST,
  WidgetType.COLORS_LIST,
  WidgetType.IMAGE_UPLOAD,
  WidgetType.THUMBNAILS_LIST
];

export function canSelectMultipleOptionValues (
  customization: Customization
): boolean {
  if (!customization.optionData) {
    return false;
  }

  if (!customization.optionData.maxValuesCount) {
    return false;
  }

  return widgetTypesCanSelectMultipleOptionValues.includes(
    customization.optionData.displayWidget
  ) && customization.optionData.maxValuesCount > 1;
}
