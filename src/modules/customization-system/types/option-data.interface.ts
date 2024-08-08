import { OptionType } from './option-type';
import { OptionValue } from './option-value.interface';
import { WidgetOptions } from './widget-options.interface';
import { WidgetType } from './widget-type';

export interface OptionData {
  description?: string,
  displayWidget: WidgetType,
  displayWidgetOptions?: WidgetOptions,
  hasDetailedDescription: boolean,
  hasGalleryImages: boolean,
  hint?: string,
  isRequired: boolean,
  maxValuesCount: number,
  previewUrl?: string,
  showInUrlQuery: boolean,
  sku?: string,
  type: OptionType,
  values?: OptionValue[]
}
