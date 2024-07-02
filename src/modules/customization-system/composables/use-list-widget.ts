import { computed, Ref, SetupContext } from '@vue/composition-api';

import { ListWidgetInputType } from '../types/list-widget-input-type';
import { OptionValue } from '../types/option-value.interface';

export function useListWidget (
  selectedValue: Ref<string | string[] | undefined>,
  maxValuesCount: Ref<number | undefined>,
  { emit }: SetupContext
) {
  const inputType = computed<ListWidgetInputType>(() => {
    if (!maxValuesCount.value) {
      return ListWidgetInputType.CHECKBOX;
    }

    return maxValuesCount.value > 1
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
    set: (value) => {
      const isCheckbox = inputType.value === ListWidgetInputType.CHECKBOX;

      if (isCheckbox) {
        handleCheckboxInput(value)
        return;
      }

      handleRadioInput(value);
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

  function handleCheckboxInput (value: string | string[] | undefined): void {
    if (!value) {
      emit('input', []);
      return;
    }

    if (!Array.isArray(value)) {
      value = [value]
    }

    if (
      maxValuesCount.value &&
      value.length > maxValuesCount.value
    ) {
      return
    }

    emit('input', value);
  }

  function handleRadioInput (value: string | string[] | undefined): void {
    if (Array.isArray(value)) {
      value = value[0];
    }

    emit('input', value);
  }

  return {
    inputType,
    isSelected,
    selectedOption
  }
}
