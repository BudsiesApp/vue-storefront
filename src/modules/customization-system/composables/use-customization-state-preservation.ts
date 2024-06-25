import { computed, Ref, watch } from '@vue/composition-api';
import { Mutex, MutexInterface } from 'async-mutex';
import { StorageManager } from 'core/lib/storage-manager';

import CartItem from 'core/modules/cart/types/CartItem';

import { CustomizationStateItem } from '../types/customization-state-item.interface';
import { STORAGE_NAME } from '../types/storage-name';

const STORAGE_BASE_KEY = 'form-state';

export function useCustomizationStatePreservation (
  productSku: Ref<string | undefined>,
  customizationState: Ref<CustomizationStateItem[]>,
  existingCartItem: Ref<CartItem | undefined>
) {
  const mutex = new Mutex();
  const customizationSystemStorage = StorageManager.get(STORAGE_NAME);

  const storageItemKey = computed<string>(() => {
    return `${STORAGE_BASE_KEY}/${productSku}`;
  });

  async function preserveState (state: CustomizationStateItem[]): Promise<void> {
    const mutexRelease = await mutex.acquire();

    try {
      await customizationSystemStorage.setItem(
        storageItemKey,
        state
      );
    } finally {
      mutexRelease();
    }
  }

  async function removePreservedState (): Promise<void> {
    const mutexRelease = await mutex.acquire();

    try {
      await customizationSystemStorage.removeItem(
        storageItemKey
      );
    } finally {
      mutexRelease();
    }
  }

  function getPreservedState (): Promise<CustomizationStateItem[] | undefined> {
    return customizationSystemStorage.getItem(storageItemKey);
  }

  watch(customizationState, (value) => {
    if (!value.length || existingCartItem.value) {
      return;
    }

    preserveState(customizationState.value);
  });

  return {
    getPreservedState,
    removePreservedState
  }
}
