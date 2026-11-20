import { Customization } from '../types/customization.interface';
import { WidgetType } from '../types/widget-type';

export function isImageUploadCustomization (customization: Customization): boolean {
  return customization.optionData?.displayWidget === WidgetType.IMAGE_UPLOAD;
}
