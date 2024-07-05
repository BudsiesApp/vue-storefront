import { CustomizationStateItem } from '../types/customization-state-item.interface';
import { isFileUploadValue } from '../types/is-file-upload-value.typeguard';
import { PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID } from '../types/production-time-selector-standard-option-value-id';

const valuesForFilter = [PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID];

export function filterCustomizationState (customizationState: CustomizationStateItem[]): CustomizationStateItem[] {
  const filteredState: CustomizationStateItem[] = [];

  for (const stateItem of customizationState) {
    if (isFileUploadValue(stateItem.value) || typeof stateItem.value === 'number') {
      filteredState.push(stateItem);
      continue;
    }

    if (
      !Array.isArray(stateItem.value) &&
      !valuesForFilter.includes(stateItem.value)
    ) {
      filteredState.push(stateItem);
      continue;
    }

    if (Array.isArray(stateItem.value)) {
      const filteredValues = stateItem.value.filter((value) => {
        return !valuesForFilter.includes(value);
      });

      filteredState.push({
        customizationId: stateItem.customizationId,
        value: filteredValues
      });
    }
  }

  return filteredState;
}
