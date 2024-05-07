import { OptionType } from './option-type';
import { OptionValue } from './option-value.interface';
import { WidgetType } from './widget-type';

export interface OptionData {
  sku?: string,
  description?: string,
  previewUrl?: string,
  maxValuesCount: number,
  hasGalleryImages: boolean,
  isRequired: boolean,
  type: OptionType,
  displayWidget: WidgetType,
  values: OptionValue[]
}
