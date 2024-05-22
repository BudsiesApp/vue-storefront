import { Ref, watch } from '@vue/composition-api';

import { OptionValue } from '..';

export function useDefaultValue (
  selectedOption: Ref<string | string[] | undefined>,
  values: Ref<OptionValue[]>
): void {
  function setDefaultValue (): void {
    const defaultValue = values.value.find((value) => value.isDefault);
    const value = selectedOption.value;
    const isArray = Array.isArray(value);

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

  watch(values, (newValues, oldValues) => {
    if (!selectedOption.value || !oldValues.length) {
      return;
    }

    if (!newValues.find((value) => value.id === selectedOption.value)) {
      selectedOption.value = undefined;
      setDefaultValue();
    }
  });
}
