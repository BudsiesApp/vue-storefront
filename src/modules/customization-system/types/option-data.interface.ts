import { OptionType } from './option-type';
import { OptionValue } from './option-value.interface';
import { WidgetConfigLayout } from './widget-config-layout.type';
import { WidgetConfigShape } from './widget-config-shape.type';
import { WidgetType } from './widget-type';

export interface OptionData {
  sku?: string,
  description?: string,
  hint?: string,
  previewUrl?: string,
  maxValuesCount: number,
  hasGalleryImages: boolean,
  isRequired: boolean,
  type: OptionType,
  displayWidget: WidgetType,
  values: OptionValue[],
  widgetConfig?: {
    shape?: WidgetConfigShape,
    layout?: WidgetConfigLayout
  }
}
