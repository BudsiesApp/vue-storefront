import { Customization } from '../types/customization.interface';
import { OptionType } from '../types/option-type';

export function isEmailCustomization (customization: Customization): boolean {
  return customization.optionData?.type === OptionType.CUSTOMER_EMAIL;
}
