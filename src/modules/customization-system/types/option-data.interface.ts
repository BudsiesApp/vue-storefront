import { OptionType } from './option-type';
import { OptionValue } from './option-value.interface';
import { WidgetConfigLayout } from './widget-config-layout.type';
import { WidgetConfigShape } from './widget-config-shape.type';
import { WidgetType } from './widget-type';

export interface OptionData {
  description?: string,
  displayWidget: WidgetType,
  hasGalleryImages: boolean,
  hint?: string,
  isRequired: boolean,
  maxValuesCount: number,
  previewUrl?: string,
  sku?: string,
  type: OptionType,
  values: OptionValue[],
  widgetConfig?: {
    layout?: WidgetConfigLayout,
    placeholder?: string,
    shape?: WidgetConfigShape
  }
}
