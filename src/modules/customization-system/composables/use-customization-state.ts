import { ref, computed, del, set, Ref, onMounted } from '@vue/composition-api';

import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';

import { CustomizationOptionValue, CustomizationStateItem } from '..';
import { isFileUploadValue } from '../types/is-file-upload-value.typeguard';

export function useCustomizationState (
  existingCartItem: Ref<CartItem | undefined>
) {
  const customizationOptionValue = ref<Record<string, CustomizationOptionValue>>({});
  const customizationState = computed<CustomizationStateItem[]>(() => {
    const items: CustomizationStateItem[] = [];

    for (const customizationId of Object.keys(customizationOptionValue.value)) {
      const value = customizationOptionValue.value[customizationId];

      if (!value) {
        continue;
      }

      items.push({
        customizationId,
        value
      });
    }

    return items;
  });
  const selectedOptionValuesIds = computed<string[]>(() => {
    const selectedValues: string[] = [];

    customizationState.value.forEach((state) => {
      if (isFileUploadValue(state.value)) {
        return;
      }

      if (Array.isArray(state.value)) {
        selectedValues.push(...state.value);
      } else {
        selectedValues.push(state.value);
      }
    });

    return selectedValues;
  });

  function updateCustomizationOptionValue (
    {
      customizationId,
      value
    }: {
      customizationId: string,
      value: CustomizationOptionValue
    }
  ): void {
    const isOptionValueEmptyArray = Array.isArray(value) && value.length === 0;

    if (!value || isOptionValueEmptyArray) {
      del(customizationOptionValue.value, customizationId);
      return;
    }

    set(customizationOptionValue.value, customizationId, value);
  }

  function addCustomizationOptionValue (customizationId: string, optionValueId: string) {
    const value = customizationOptionValue.value[customizationId];

    if (isFileUploadValue(value)) {
      return;
    }

    if (!value || !Array.isArray(value)) {
      customizationOptionValue.value[customizationId] = optionValueId;
      return;
    }

    value.push(optionValueId)
    set(customizationOptionValue.value, customizationId, value);
  }

  function removeCustomizationOptionValue (
    optionValueId: string
  ): void {
    if (!selectedOptionValuesIds.value.includes(optionValueId)) {
      return;
    }

    // TODO: temporary - current TS version don't handle `value` type right in this case
    for (const customizationId in (customizationOptionValue.value as unknown as Record<string, CustomizationOptionValue>)) {
      const value = customizationOptionValue.value[customizationId];

      if (!value || isFileUploadValue(value)) {
        continue;
      }

      if (!Array.isArray(value)) {
        del(customizationOptionValue, customizationId);
        continue;
      }

      if (!value.includes(optionValueId)) {
        continue;
      }

      set(customizationOptionValue, customizationId, value.filter((id) => id !== optionValueId));
    }
  }

  function fillCustomizationStateFromExistingCartItem () {
    if (!existingCartItem.value || !existingCartItem.value.customizationState) {
      return;
    }

    const customizationOptionValueDictionary: Record<string, CustomizationOptionValue> = {};

    existingCartItem.value.customizationState.forEach((item) => {
      customizationOptionValueDictionary[item.customizationId] = item.value;
    });

    // TODO: temporary - current TS version don't handle `value` type right in this case
    (customizationOptionValue.value as unknown as Record<string, CustomizationOptionValue>) = customizationOptionValueDictionary;
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
    addCustomizationOptionValue,
    customizationOptionValue,
    customizationState,
    removeCustomizationOptionValue,
    selectedOptionValuesIds,
    updateCustomizationOptionValue
  }
}
