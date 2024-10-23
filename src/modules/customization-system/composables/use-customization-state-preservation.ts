import { computed, ref, Ref, watch } from '@vue/composition-api';
import { Mutex } from 'async-mutex';

import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import CartItem from 'core/modules/cart/types/CartItem';

import { CustomizationStateItem } from '../types/customization-state-item.interface';
import { STORAGE_NAME } from '../types/storage-name';

const STORAGE_BASE_KEY = 'form-state';

interface PersistedData {
  customizationState: CustomizationStateItem[],
  additionalData?: Record<string, any>
}

export function useCustomizationStatePreservation (
  productSku: Ref<string | undefined>,
  customizationState: Ref<CustomizationStateItem[]>,
  existingCartItem: Ref<CartItem | undefined>,
  customizationStateFilters: ((customizationId: string) => boolean)[] = [],
  additionalData?: Ref<Record<string, any>> | undefined
) {
  const mutex = new Mutex();
  const customizationSystemStorage = StorageManager.get(STORAGE_NAME);
  const isRestored = ref(false);

  const storageItemKey = computed<string>(() => {
    return `${STORAGE_BASE_KEY}/${productSku.value}`;
  });

  const filterCustomizationState = (item: CustomizationStateItem): boolean => {
    for (const filter of customizationStateFilters) {
      if (!filter(item.customization_id)) {
        return false;
      }
    }

    return true;
  }

  const filteredCustomizationState = computed<CustomizationStateItem[]>(() => {
    return customizationState.value.filter(filterCustomizationState);
  });

  async function preserveState (state: CustomizationStateItem[]): Promise<void> {
    if (!storageItemKey.value) {
      return;
    }

    const mutexRelease = await mutex.acquire();

    const data: PersistedData = {
      customizationState: state
    }

    if (additionalData && additionalData.value) {
      data.additionalData = additionalData.value;
    }

    try {
      await customizationSystemStorage.setItem(
        storageItemKey.value,
        data
      );
    } finally {
      mutexRelease();
    }
  }

  async function removePreservedState (): Promise<void> {
    if (!storageItemKey.value) {
      isRestored.value = true;
      return;
    }

    const mutexRelease = await mutex.acquire();

    try {
      await customizationSystemStorage.removeItem(
        storageItemKey.value
      );
    } finally {
      isRestored.value = true;
      mutexRelease();
    }
  }

  async function getPreservedData (): Promise<PersistedData | undefined> {
    if (!storageItemKey.value) {
      isRestored.value = true;
      return;
    }

    const mutexRelease = await mutex.acquire();

    try {
      const data: PersistedData | undefined = await customizationSystemStorage.getItem(storageItemKey.value);

      if (data?.customizationState) {
        data.customizationState = data.customizationState.filter(filterCustomizationState);
      }

      return data;
    } finally {
      isRestored.value = true;
      mutexRelease();
    }
  }
  const watchProperties: Ref<any>[] = [filteredCustomizationState, isRestored];

  if (additionalData) {
    watchProperties.push(additionalData);
  }

  watch(watchProperties, (value) => {
    if (!value.length || existingCartItem.value || !isRestored.value) {
      return;
    }

    preserveState(filteredCustomizationState.value);
  });

  return {
    getPreservedData,
    removePreservedState
  }
}
