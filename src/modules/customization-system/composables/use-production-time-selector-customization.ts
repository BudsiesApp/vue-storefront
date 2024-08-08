
import { computed, Ref, watch } from '@vue/composition-api';

import CartItem from 'core/modules/cart/types/CartItem';

import { CustomizationOptionValue } from '../types/customization-option-value';
import { Customization } from '../types/customization.interface';
import { OptionType } from '../types/option-type';
import { PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID } from '../types/production-time-selector-standard-option-value-id';

// TODO: temporary until separate option value for "Standard"
// production time will be added
export function useProductionTimeSelectorCustomization (
  availableCustomizations: Ref<Customization[]>,
  customizationOptionValue: Ref<Record<string, CustomizationOptionValue>>,
  existingCartItem: Ref<CartItem | undefined>,
  updateCustomizationOptionValue: (payload: {
    customizationId: string,
    value: CustomizationOptionValue
  }) => void
) {
  const productionTimeSelectorCustomization = computed<Customization | undefined>(() => {
    return availableCustomizations.value.find(
      (customization) => customization.optionData?.type === OptionType.PRODUCTION_TIME
    );
  });

  function fillStandardProductionTime (): void {
    if (
      !existingCartItem.value ||
      !productionTimeSelectorCustomization.value ||
      !!customizationOptionValue.value[productionTimeSelectorCustomization.value.id]
    ) {
      return;
    }

    updateCustomizationOptionValue({
      customizationId: productionTimeSelectorCustomization.value.id,
      value: PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID
    });
  }

  watch(
    productionTimeSelectorCustomization,
    (value) => {
      if (!value) {
        return;
      }

      fillStandardProductionTime();
    },
    {
      immediate: true
    })
}
