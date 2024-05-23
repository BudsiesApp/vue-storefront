import { computed, ref, set } from '@vue/composition-api';

export function useCustomizationsBusyState () {
  const customizationsBusyState = ref<Record<string, boolean>>({});
  const isSomeCustomizationOptionBusy = computed<boolean>(() => {
    return Object.values(customizationsBusyState.value).some((isBusy) => isBusy);
  });

  function onCustomizationOptionBusyChanged (
    { isBusy,
      customizationId
    }: {
      isBusy: boolean,
      customizationId: string
    }
  ): void {
    set(customizationsBusyState.value, customizationId, isBusy);
  }

  return {
    isSomeCustomizationOptionBusy,
    onCustomizationOptionBusyChanged
  }
}
