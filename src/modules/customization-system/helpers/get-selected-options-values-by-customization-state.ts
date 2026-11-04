import { CustomizationStateItem } from '../types/customization-state-item.interface';
import { Customization } from '../types/customization.interface';
import { isFileUploadValue } from '../types/is-file-upload-value.typeguard';
import { OptionValue } from '../types/option-value.interface';

type SelectedOptionValue = OptionValue & { quantity: number };

function getCustomizationDictionary (customizations: Customization[]): Record<string, Customization> {
  const dictionary: Record<string, Customization> = {};

  for (const customization of customizations) {
    dictionary[customization.id] = customization;
  }

  return dictionary;
}

export function getSelectedOptionValuesByCustomizationState (
  customizationState: CustomizationStateItem[] | undefined,
  customizations: Customization[] | undefined
): SelectedOptionValue[] {
  if (!customizationState || !customizations) {
    return [];
  }

  const customizationDictionary = getCustomizationDictionary(customizations);
  const optionValues: SelectedOptionValue[] = [];

  for (const customizationStateItem of customizationState) {
    if (isFileUploadValue(customizationStateItem.value)) {
      continue;
    }

    const customization =
      customizationDictionary[customizationStateItem.customization_id];

    if (
      !customization?.optionData?.values
    ) {
      continue;
    }

    const selectedValues = Array.isArray(customizationStateItem.value)
      ? customizationStateItem.value
      : [customizationStateItem.value];

    for (const optionValue of customization.optionData.values) {
      if (!selectedValues.includes(optionValue.id)) {
        continue;
      }

      optionValues.push({ ...optionValue, quantity: customizationStateItem.quantity ?? 1 });
    }
  }

  return optionValues;
}
