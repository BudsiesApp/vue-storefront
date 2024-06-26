import { computed, Ref, watch } from '@vue/composition-api';
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
  additionalData?: Ref<Record<string, any> | undefined>
) {
  const mutex = new Mutex();
  const customizationSystemStorage = StorageManager.get(STORAGE_NAME);

  const storageItemKey = computed<string>(() => {
    return `${STORAGE_BASE_KEY}/${productSku.value}`;
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
      return;
    }

    const mutexRelease = await mutex.acquire();

    try {
      await customizationSystemStorage.removeItem(
        storageItemKey.value
      );
    } finally {
      mutexRelease();
    }
  }

  async function getPreservedData (): Promise<PersistedData | undefined> {
    if (!storageItemKey.value) {
      return;
    }

    return customizationSystemStorage.getItem(storageItemKey.value);
  }

  watch(customizationState, (value) => {
    if (!value.length || existingCartItem.value) {
      return;
    }

    preserveState(customizationState.value);
  });

  return {
    getPreservedData,
    removePreservedState
  }
}
