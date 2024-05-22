import { CustomizationStateItem } from '../types/customization-state-item.interface';
import { Customization } from '../types/customization.interface';
import { isFileUploadValue } from '../types/is-file-upload-value.typeguard';
import { OptionValue } from '../types/option-value.interface';

export function getCustomizationSelectedValues (
  customization: Customization,
  customizationStateItem: CustomizationStateItem | undefined
): OptionValue[] | undefined {
  if (
    !customizationStateItem ||
    !customization.optionData ||
    isFileUploadValue(customizationStateItem.value)
  ) {
    return;
  }

  const selectedValuesIds: string[] = Array.isArray(customizationStateItem.value)
    ? customizationStateItem.value
    : [customizationStateItem.value];
  const selectedValues: OptionValue[] = [];

  selectedValuesIds.forEach((id) => {
    const selectedValue = customization.optionData?.values.find((value) => id === value.id);

    if (selectedValue) {
      selectedValues.push(selectedValue);
    }
  });

  return selectedValues;
}
