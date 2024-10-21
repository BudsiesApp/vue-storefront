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
      const productPriceDictionary = root.$store.getters['product/productPriceDictionary'];

      // TODO: quick fix, need to refactor
      const _ = root.$store.getters['promotionPlatform/campaignContent'];

      values.value.forEach((optionValue) => {
        dictionary[optionValue.id] = getOptionValuePrice(
          optionValue,
          productBySkuDictionary,
          productPriceDictionary
        );
      });

      return dictionary;
    }
  );

  const defaultOptionValue = computed<OptionValue | undefined>(() => {
    const _values = values.value;
    const defaultValue = _values.find((value) => value.isDefault);

    if (defaultValue) {
      return defaultValue;
    }

    let valueWithLowestPrice: OptionValue | undefined;
    let lowestFinalPrice: number | undefined;
    const _optionValuePriceDictionary = optionValuePriceDictionary.value;

    for (const optionValue of _values) {
      const optionValuePrice = _optionValuePriceDictionary[optionValue.id];

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
    const _defaultOptionValue = defaultOptionValue.value;
    if (!_defaultOptionValue) {
      return;
    }

    return optionValuePriceDictionary.value[_defaultOptionValue.id];
  });

  const defaultOptionValueFinalPrice = computed<number | undefined>(() => {
    const _defaultOptionValuePrice = defaultOptionValuePrice.value;
    if (!_defaultOptionValuePrice) {
      return;
    }

    return PriceHelper.getFinalPrice(_defaultOptionValuePrice);
  });
  const optionValuePriceDeltaDictionary = computed<Record<string, PriceHelper.ProductPrice | undefined>>(() => {
    const dictionary: Record<string, PriceHelper.ProductPrice | undefined> = {};
    const _defaultOptionValueFinalPrice = defaultOptionValueFinalPrice.value;

    if (!_defaultOptionValueFinalPrice) {
      return dictionary;
    }

    const _optionValuePriceDictionary = optionValuePriceDictionary.value;

    for (const optionValueId of Object.keys(_optionValuePriceDictionary)) {
      const optionValuePrice = _optionValuePriceDictionary[optionValueId];

      if (!optionValuePrice) {
        continue;
      }

      const priceDelta: PriceHelper.ProductPrice = {
        regular: optionValuePrice.regular - _defaultOptionValueFinalPrice,
        special: optionValuePrice.special != null
          ? optionValuePrice.special - _defaultOptionValueFinalPrice
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
    const _defaultOptionValue = defaultOptionValue.value;
    return !!_defaultOptionValue && _defaultOptionValue.id === optionValue.id;
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
