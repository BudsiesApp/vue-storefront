import { computed, Ref, SetupContext } from '@vue/composition-api';

import { OptionValue } from '../types/option-value.interface';

export function useListWidget (
  selectedValue: Ref<string | string[] | undefined>,
  maxValuesCount: Ref<number | undefined>,
  { emit }: SetupContext
) {
  const inputType = computed<'checkbox' | 'radio'>(() => {
    return maxValuesCount.value && maxValuesCount.value > 1 ? 'checkbox' : 'radio';
  });
  const selectedOption = computed<string | string[] | undefined>({
    get: () => {
      if (inputType.value === 'checkbox' && selectedValue.value === undefined) {
        return [];
      }

      if (inputType.value !== 'checkbox' && Array.isArray(selectedValue.value)) {
        return selectedValue.value[0];
      }

      return selectedValue.value;
    },
    set: (newValue) => {
      emit('input', newValue);
    }
  });

  function isSelected (option: OptionValue): boolean {
    if (inputType.value === 'checkbox') {
      return Array.isArray(selectedValue.value) && selectedValue.value.includes(option.id);
    }

    return typeof selectedValue.value === 'string' && selectedValue.value === option.id;
  }

  return {
    inputType,
    isSelected,
    selectedOption
  }
}
