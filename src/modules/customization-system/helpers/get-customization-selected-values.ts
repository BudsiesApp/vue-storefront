import { CustomizationOptionValue } from '../types/customization-option-value';
import { Customization } from '../types/customization.interface';
import { isFileUploadValue } from '../types/is-file-upload-value.typeguard';
import { OptionValue } from '../types/option-value.interface';

export function getCustomizationSelectedValues (
  customization: Customization,
  customizationOptionValue: CustomizationOptionValue | undefined
): OptionValue[] | undefined {
  if (
    !customizationOptionValue ||
    !customization.optionData ||
    isFileUploadValue(customizationOptionValue)
  ) {
    return;
  }

  const selectedValuesIds: string[] = Array.isArray(customizationOptionValue)
    ? customizationOptionValue
    : [customizationOptionValue];

  const selectedValues: OptionValue[] = [];

  selectedValuesIds.forEach((id) => {
    const selectedValue = customization.optionData?.values.find((value) => id === value.id);

    if (selectedValue) {
      selectedValues.push(selectedValue);
    }
  });

  return selectedValues;
}
