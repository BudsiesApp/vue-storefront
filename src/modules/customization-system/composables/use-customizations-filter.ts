import { computed, Ref } from '@vue/composition-api';

import { Customization } from '../types/customization.interface';
import { OptionValue } from '../types/option-value.interface';

export function useCustomizationsFilter (
  availableCustomizations: Ref<Customization[]>,
  customizationAvailableOptionValues: Ref<Record<string, OptionValue[]>>,
  filters: ((customization: Customization, availableOptionValues?: OptionValue[]) => boolean)[]
) {
  const filteredCustomizations = computed<Customization[]>(() => {
    return availableCustomizations.value.filter((customization) => {
      for (const filter of filters) {
        const availableOptionValues = customizationAvailableOptionValues.value[customization.id];

        if (!filter(customization, availableOptionValues)) {
          return false;
        }
      }

      return true;
    });
  });

  return { filteredCustomizations };
}
