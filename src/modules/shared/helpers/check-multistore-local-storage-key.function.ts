import { storeViews } from 'config';
import { currentStoreView } from '@vue-storefront/core/lib/multistore'

export function checkMultiStoreLocalStorageKey (key: string, path: string): boolean {
  const { multistore, commonCache } = storeViews;
  const storeView = currentStoreView();

  if ((!multistore && !storeView.storeCode) || (multistore && commonCache)) return key === path

  return key === `${storeView.storeCode}-${path}`
}
