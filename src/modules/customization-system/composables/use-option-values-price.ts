import { Ref, computed, SetupContext } from '@vue/composition-api';

import { PriceHelper } from 'src/modules/shared';

import { getOptionValuePrice } from '../helpers/get-option-value-price';
import { OptionValue } from '../types/option-value.interface';

export function useOptionValuesPrice (
  values: Ref<OptionValue[]>,
  { root }: SetupContext
) {
  const optionValuePriceDictionary = computed<Record<string, PriceHelper.ProductPrice | undefined>>(
    () => {
      const dictionary: Record<string, PriceHelper.ProductPrice | undefined> = {};
      const productBySkuDictionary = root.$store.getters['product/getProductBySkuDictionary'];

      values.value.forEach((optionValue) => {
        dictionary[optionValue.id] = getOptionValuePrice(optionValue, productBySkuDictionary);
      });

      return dictionary;
    }
  );

  return {
    optionValuePriceDictionary,
    formatPrice: PriceHelper.formatPrice
  }
}
