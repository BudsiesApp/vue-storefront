import rootStore from '@vue-storefront/core/store';
import { RushAddon } from 'src/modules/budsies';

import { Customization } from '../types/customization.interface';
import { OptionType } from '../types/option-type';

export function isProductionTimeCustomizationUnavailable (
  customization: Customization
): boolean {
  const isProductionTimeCustomization = customization.optionData?.type === OptionType.PRODUCTION_TIME;

  if (!isProductionTimeCustomization) {
    return false;
  }

  const productId = rootStore.getters['product/getCurrentProduct']?.id;

  if (!productId) {
    return true;
  }

  const availableAddons: RushAddon[] = rootStore.getters['budsies/getProductRushAddons'](productId);

  return availableAddons.length === 0;
}
