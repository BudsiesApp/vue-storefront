import { checkMultiStoreLocalStorageKey } from 'src/modules/shared/helpers/check-multi-store-local-storage-key.function'

import { SN_BUDSIES } from '../store/mutation-types'
import { INSTANCE_ID } from '../types/local-storage-key'

export function getItemsFromStorageFactory (
  renewInstanceId: () => void,
  setInstanceId: (value: string) => void
) {
  return ({ key }: {key: string | null}) => {
    if (!key) {
      renewInstanceId();
      return;
    }

    const isInstanceIdChanged = checkMultiStoreLocalStorageKey(
      key,
      `${SN_BUDSIES}/${INSTANCE_ID}`
    );

    if (!isInstanceIdChanged) {
      return;
    }

    const rawValue = localStorage[key];

    if (!rawValue) {
      renewInstanceId();
      return;
    }

    const value = JSON.parse(rawValue);

    setInstanceId(value);
  }
}
