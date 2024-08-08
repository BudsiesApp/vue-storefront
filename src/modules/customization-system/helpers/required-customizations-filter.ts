import { Customization } from '../types/customization.interface';
import { OptionType } from '../types/option-type';
import { OptionValue } from '../types/option-value.interface';

export function requiredCustomizationsFilter (
  customization: Customization,
  availableOptionValues?: OptionValue[]
): boolean {
  if (!customization.optionData) {
    return true;
  }

  if (customization.optionData.type === OptionType.PRODUCTION_TIME) {
    return true;
  }

  if (!availableOptionValues) {
    return true;
  }

  return !(customization.optionData?.isRequired && availableOptionValues.length === 1);
}
