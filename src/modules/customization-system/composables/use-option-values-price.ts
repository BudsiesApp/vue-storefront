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

  const defaultOptionValue = computed<OptionValue | undefined>(() => {
    const defaultValue = values.value.find((value) => value.isDefault);

    if (defaultValue) {
      return defaultValue;
    }

    let valueWithLowestPrice: OptionValue | undefined;
    let lowestFinalPrice: number | undefined;

    for (const optionValue of values.value) {
      const optionValuePrice = optionValuePriceDictionary.value[optionValue.id];

      if (!optionValuePrice) {
        continue;
      }

      const optionValueFinalPrice = PriceHelper.getFinalPrice(optionValuePrice);

      if (lowestFinalPrice && optionValueFinalPrice > lowestFinalPrice) {
        continue;
      }

      valueWithLowestPrice = optionValue;
      lowestFinalPrice = optionValueFinalPrice;
    }

    return valueWithLowestPrice;
  });

  const defaultOptionValuePrice = computed<PriceHelper.ProductPrice | undefined>(() => {
    if (!defaultOptionValue.value) {
      return;
    }

    return optionValuePriceDictionary.value[defaultOptionValue.value.id];
  });

  const defaultOptionValueFinalPrice = computed<number | undefined>(() => {
    if (!defaultOptionValuePrice.value) {
      return;
    }

    return PriceHelper.getFinalPrice(defaultOptionValuePrice.value);
  });
  const optionValuePriceDeltaDictionary = computed<Record<string, PriceHelper.ProductPrice | undefined>>(() => {
    const dictionary: Record<string, PriceHelper.ProductPrice | undefined> = {};

    if (!defaultOptionValueFinalPrice.value) {
      return dictionary;
    }

    for (const optionValueId of Object.keys(optionValuePriceDictionary.value)) {
      const optionValuePrice = optionValuePriceDictionary.value[optionValueId];

      if (!optionValuePrice) {
        continue;
      }

      const priceDelta: PriceHelper.ProductPrice = {
        regular: optionValuePrice.regular - defaultOptionValueFinalPrice.value,
        special: optionValuePrice.special != null
          ? optionValuePrice.special - defaultOptionValueFinalPrice.value
          : null
      };

      dictionary[optionValueId] = priceDelta;
    }

    return dictionary;
  });

  const isOptionValuesSamePrice = computed<boolean>(() => {
    for (const price of Object.values(optionValuePriceDeltaDictionary.value)) {
      if (!price) {
        continue;
      }

      if (PriceHelper.getFinalPrice(price) !== 0) {
        return false;
      }
    }

    return true;
  });

  function isDefaultOptionValue (optionValue: OptionValue): boolean {
    return !!defaultOptionValue.value && defaultOptionValue.value.id === optionValue.id;
  }

  return {
    defaultOptionValuePrice,
    isDefaultOptionValue,
    isOptionValuesSamePrice,
    optionValuePriceDictionary,
    optionValuePriceDeltaDictionary,
    formatPrice: PriceHelper.formatPrice
  }
}
