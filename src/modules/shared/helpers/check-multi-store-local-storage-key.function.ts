import { storeViews } from 'config';
import { currentStoreView } from '@vue-storefront/core/lib/multistore'

const storeIndependentPrefix = 'shop';

export function checkMultiStoreLocalStorageKey (key: string, path: string): boolean {
  const { multistore, commonCache } = storeViews;
  const storeView = currentStoreView();
  const pathWithPrefix = `${storeIndependentPrefix}/${path}`;

  if ((!multistore && !storeView.storeCode) || (multistore && commonCache)) return key === pathWithPrefix

  return key === `${storeView.storeCode}-${pathWithPrefix}`
}
