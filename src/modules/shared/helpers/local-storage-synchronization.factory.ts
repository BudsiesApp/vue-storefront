export function localStorageSynchronizationFactory (
  getItemsFromStorage: (event: StorageEvent) => void,
  setItemsToStorage: (...args: any[]) => void
): {
    setItems: () => void,
    removeStorageEventListener: () => void
  } {
  let isSetItemsToStorageLocked = false;

  function getItems (event: StorageEvent) {
    isSetItemsToStorageLocked = true;
    getItemsFromStorage(event);
    isSetItemsToStorageLocked = false;
  }

  function setItems () {
    if (isSetItemsToStorageLocked) {
      return;
    }

    setItemsToStorage();
  }

  function removeStorageEventListener () {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('storage', getItems);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', getItems);
  }

  return {
    setItems,
    removeStorageEventListener
  }
}
