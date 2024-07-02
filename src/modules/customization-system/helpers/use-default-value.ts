import { Ref, watch } from '@vue/composition-api';

import { OptionValue } from '..';

export function useDefaultValue (
  selectedOption: Ref<string | string[] | undefined>,
  values: Ref<OptionValue[]>,
  isRequired: Ref<boolean>
): void {
  function setDefaultValue (): void {
    let defaultValue = values.value.find((value) => value.isDefault);
    const value = selectedOption.value;
    const isArray = Array.isArray(value);

    if (!defaultValue && isRequired.value) {
      defaultValue = values.value[0];
    }

    if (!defaultValue) {
      return;
    }

    if (isArray && value.length > 0) {
      return;
    }

    if (typeof value === 'string' && !!value) {
      return;
    }

    selectedOption.value = isArray ? [defaultValue.id] : defaultValue.id;
  }

  setDefaultValue();

  watch(selectedOption, (newValue) => {
    if (!newValue || (Array.isArray(newValue) && !newValue.length)) {
      setDefaultValue();
    }
  });

  watch(values, (newValues, oldValues) => {
    if (!selectedOption.value || !oldValues.length) {
      return;
    }

    if (Array.isArray(selectedOption.value)) {
      return;
    }

    if (
      !newValues.find((value) => value.id === selectedOption.value)
    ) {
      selectedOption.value = undefined;
      setDefaultValue();
    }
  });
}
