import { ref, computed, del, set, Ref, onMounted } from '@vue/composition-api';

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

  // Need to wait hydration before fill customization state
  // Otherwise it may lead to nodes mismatch
  // Because on SSR there is no cart items data
  // So some of customizations may be hidden on SSR
  // But became available after fill customization state
  onMounted(() => {
    fillCustomizationStateFromExistingCartItem();
  });

  return {
    customizationState,
    selectedOptionValuesIds,
    onCustomizationOptionInput
  }
}
