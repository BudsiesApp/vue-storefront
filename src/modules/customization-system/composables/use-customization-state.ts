import { ref, computed, del, set, Ref } from '@vue/composition-api';

import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';

import { CustomizationStateItem } from '..';

export function useCustomizationState (
  existingCartItem: Ref<CartItem | undefined>
) {
  const customizationState = ref<Record<string, CustomizationStateItem>>({});
  const selectedOptionValuesIds = computed<string[]>(() => {
    const customizationStateArray = Object.values(customizationState.value);
    const selectedValues: string[] = [];

    customizationStateArray.forEach((state) => {
      if (Array.isArray(state.value)) {
        selectedValues.push(...state.value);
      } else {
        selectedValues.push(state.value);
      }
    });

    return selectedValues;
  });

  function onCustomizationOptionInput (option: CustomizationStateItem) {
    const isOptionValueEmptyArray = Array.isArray(option.value) && option.value.length === 0;

    if (!option.value || isOptionValueEmptyArray) {
      del(customizationState.value, option.customizationId);
      return;
    }

    set(customizationState.value, option.customizationId, option);
  }

  function fillCustomizationStateFromExistingCartItem () {
    if (!existingCartItem.value || !existingCartItem.value.customizationState) {
      return;
    }

    const customizationStateDictionary: Record<string, CustomizationStateItem> = {};

    existingCartItem.value.customizationState.forEach((item) => {
      customizationStateDictionary[item.customizationId] = item;
    });

    // TODO: temporary - current TS version don't handle `value` type right in this case
    (customizationState.value as unknown as Record<string, CustomizationStateItem>) = customizationStateDictionary;
  }

  fillCustomizationStateFromExistingCartItem();

  return {
    customizationState,
    selectedOptionValuesIds,
    onCustomizationOptionInput
  }
}
