import { useStore } from '@vue-storefront/core/application-services';
import {
  PRODUCT_DISCOUNTED_PRICE_DICTIONARY
} from '@vue-storefront/core/modules/catalog';
import type { ProductDiscountedPrice } from '@vue-storefront/core/modules/catalog';
import { Ref, computed } from 'vue';

import { PriceHelper } from 'src/modules/shared';
import { GET_CURRENCY_EXCHANGE_RATE } from 'src/modules/currency';

import { CustomizationOptionValue } from '../types/customization-option-value';
import { Customization } from '../types/customization.interface';
import { getLowestPriceForOptionValues } from '../helpers/get-lowest-price-for-option-values';
import { getCustomizationSelectedValues } from '../helpers/get-customization-selected-values';
import { getOptionValuePrice } from '../helpers/get-option-value-price';

export function useCustomizationsPrice (
  customizations: Ref<Customization[]>,
  customizationOptionValue: Ref<Record<string, CustomizationOptionValue>>
) {
  const applicationStore = useStore();
  const exchangeRate = computed<number>(() => applicationStore.getters[GET_CURRENCY_EXCHANGE_RATE] || 1);
  const productDiscountedPriceDictionary = computed<Record<string, ProductDiscountedPrice>>(
    () => applicationStore.getters[PRODUCT_DISCOUNTED_PRICE_DICTIONARY] || {}
  );
  const customizationOptionValuesLowestPrice = computed<Record<string, PriceHelper.ProductPrice | undefined>>(
    () => {
      const dictionary: Record<string, PriceHelper.ProductPrice | undefined> = {};

      customizations.value.forEach((customization) => {
        if (!customization.optionData?.values) {
          return;
        }

        dictionary[customization.id] = getLowestPriceForOptionValues(
          customization.optionData.values,
          productDiscountedPriceDictionary.value,
          exchangeRate.value
        );
      });

      return dictionary;
    }
  );

  const totalPrice = computed<PriceHelper.ProductPrice>(() => {
    const selectedOptionValuesPrices: PriceHelper.ProductPrice[] = [];
    const _customizationOptionValuesLowestPrice = customizationOptionValuesLowestPrice.value;

    customizations.value.forEach((customization) => {
      if (!customization.optionData) {
        return;
      }

      if (!customization.optionData.values?.length) {
        return;
      }
      const selectedValues = getCustomizationSelectedValues(
        customization,
        customizationOptionValue.value[customization.id]
      );
      const hasSelections = !!selectedValues && selectedValues.length;

      if (!hasSelections && !customization.optionData.isRequired) {
        return;
      }

      if (!hasSelections) {
        const lowestPrice = _customizationOptionValuesLowestPrice[customization.id];

        if (lowestPrice) {
          selectedOptionValuesPrices.push(lowestPrice);
        }
      }

      if (!selectedValues) {
        return;
      }

      selectedValues.forEach((value) => {
        selectedOptionValuesPrices.push(getOptionValuePrice(value, productDiscountedPriceDictionary.value, exchangeRate.value));
      });
    });

    return PriceHelper.getTotalPriceForProductPrices(selectedOptionValuesPrices);
  });

  return {
    totalPrice
  };
}
