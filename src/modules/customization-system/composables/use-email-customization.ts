import { computed, nextTick, onMounted, ref, Ref } from '@vue/composition-api';
import { usePersistedEmail } from 'src/modules/persisted-customer-data';
import { isEmailCustomization } from '../helpers/is-email-customization';
import { CustomizationOptionValue } from '../types/customization-option-value';
import { CustomizationStateItem } from '../types/customization-state-item.interface';

import { Customization } from '../types/customization.interface';

export function useEmailCustomization (
  availableCustomizations: Ref<Customization[]>,
  customizationOptionValue: Ref<Record<string, CustomizationOptionValue>>,
  updateCustomizationOptionValue: (payload: CustomizationStateItem) => void
) {
  const emailCustomization = computed<Customization | undefined>(() => {
    return availableCustomizations.value.find((customization) => {
      return isEmailCustomization(customization);
    });
  });

  const emailValue = computed<string | undefined>({
    get () {
      if (!emailCustomization.value) {
        return;
      }

      const value = customizationOptionValue.value[emailCustomization.value.id];

      if (typeof value !== 'string') {
        return;
      }

      return value;
    },
    set (newValue: string | undefined) {
      if (!emailCustomization.value) {
        return;
      }

      updateCustomizationOptionValue({
        customizationId: emailCustomization.value.id,
        value: newValue || ''
      });
    }
  });

  const isMounted = ref<boolean>(false);

  const { hasPrefilledEmail, persistLastUsedCustomerEmail } = usePersistedEmail(emailValue);

  onMounted(async () => {
    await nextTick();
    isMounted.value = true;
  });

  function persistCustomerEmail (): void {
    if (!emailValue.value) {
      return;
    }

    persistLastUsedCustomerEmail(emailValue.value);
  }

  function emailCustomizationFilter (customization: Customization): boolean {
    if (!isMounted.value) {
      return true;
    }

    if (!isEmailCustomization(customization)) {
      return true;
    }

    return !hasPrefilledEmail.value;
  }

  return {
    emailCustomizationFilter,
    hasPrefilledEmail,
    persistCustomerEmail
  };
}
