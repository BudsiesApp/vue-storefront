import { storeViews } from 'config';
import { currentStoreView } from '@vue-storefront/core/lib/multistore'

export function checkMultiStoreLocalStorageKey (key: string, path: string): boolean {
  const { multistore, commonCache } = storeViews;
  const storeView = currentStoreView();

  let storePrefix = 'shop';

  if ((!multistore && storeView.storeCode) || (multistore && !commonCache)) {
    storePrefix = storeView.storeCode + '-' + storePrefix;
  }

  const pathWithPrefix = `${storePrefix}/${path}`;

  return key === pathWithPrefix;
}
