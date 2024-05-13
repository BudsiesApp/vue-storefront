import { computed, Ref, SetupContext } from '@vue/composition-api';

import { ListWidgetInputType } from '../types/list-widget-input-type';
import { OptionValue } from '../types/option-value.interface';

export function useListWidget (
  selectedValue: Ref<string | string[] | undefined>,
  maxValuesCount: Ref<number | undefined>,
  { emit }: SetupContext
) {
  const inputType = computed<ListWidgetInputType>(() => {
    return maxValuesCount.value && maxValuesCount.value > 1
      ? ListWidgetInputType.CHECKBOX
      : ListWidgetInputType.RADIO;
  });
  const selectedOption = computed<string | string[] | undefined>({
    get: () => {
      if (
        inputType.value === ListWidgetInputType.CHECKBOX &&
        selectedValue.value === undefined
      ) {
        return [];
      }

      if (
        inputType.value !== ListWidgetInputType.CHECKBOX &&
        Array.isArray(selectedValue.value)
      ) {
        return selectedValue.value[0];
      }

      return selectedValue.value;
    },
    set: (newValue) => {
      emit('input', newValue);
    }
  });

  function isSelected (option: OptionValue): boolean {
    if (inputType.value === ListWidgetInputType.CHECKBOX) {
      return Array.isArray(selectedValue.value) &&
        selectedValue.value.includes(option.id);
    }

    return typeof selectedValue.value === 'string' &&
      selectedValue.value === option.id;
  }

  return {
    inputType,
    isSelected,
    selectedOption
  }
}
