import config from 'config';
import { v4 as uuidv4 } from 'uuid';

import { isServer } from '@vue-storefront/core/helpers';
import { getStorageName } from '@vue-storefront/core/lib/storage-manager';

import { getItemsFromStorageFactory } from './sync-local-storage-change.factory';
import { SN_BUDSIES } from '../store/mutation-types';
import { INSTANCE_ID } from '../types/local-storage-key';

function getLocalStorageItemKey (): string {
  return `${getStorageName()}/${SN_BUDSIES}/${INSTANCE_ID}`;
}

export function debugDataFactory () {
  let instanceId: string | undefined;
  const localStorageItemKey = getLocalStorageItemKey();

  function createInstanceId (): void {
    if (isServer) {
      return;
    }

    instanceId = uuidv4();
    localStorage.setItem(localStorageItemKey, instanceId);
  }

  function getDebugData () {
    return {
      instanceId,
      appVersion: config.app.version
    }
  }

  let storedInstanceIdRaw;
  let getItemsFromStorage: (({ key }: {key: string | null}) => void);

  if (!isServer) {
    storedInstanceIdRaw = localStorage.getItem(localStorageItemKey);
    getItemsFromStorage = getItemsFromStorageFactory(
      createInstanceId,
      (value) => (instanceId = value)
    );

    window.addEventListener('storage', getItemsFromStorage);
  }

  if (!storedInstanceIdRaw) {
    createInstanceId();
  } else {
    instanceId = storedInstanceIdRaw;
  }

  return {
    createInstanceId,
    getDebugData
  }
}
