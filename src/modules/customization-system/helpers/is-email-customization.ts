import { Customization } from '../types/customization.interface';
import { WidgetType } from '../types/widget-type';

export function isEmailCustomization (customization: Customization): boolean {
  return customization.optionData?.displayWidget === WidgetType.EMAIL_INPUT;
}
