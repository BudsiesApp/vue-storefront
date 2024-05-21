import { Ref, computed, SetupContext } from '@vue/composition-api';

import { PriceHelper } from 'src/modules/shared';
import Product from '@vue-storefront/core/modules/catalog/types/Product';

import { CustomizationStateItem, Customization, OptionValue } from '..';
import { getLowestPriceForOptionValues } from '../helpers/get-lowest-price-for-option-values';
import { getCustomizationSelectedValues } from '../helpers/get-customization-selected-values';
import { getOptionValuePrice } from '../helpers/get-option-value-price';

export function useCustomizationsPrice (
  customizations: Ref<Customization[]>,
  customizationState: Ref<Record<string, CustomizationStateItem>>,
  { root }: SetupContext
) {
  const customizationOptionValuesLowestPrice = computed<Record<string, PriceHelper.ProductPrice | undefined>>(
    () => {
      const dictionary: Record<string, PriceHelper.ProductPrice | undefined> = {};
      const productBySkuDictionary = root.$store.getters['product/getProductBySkuDictionary'];

      customizations.value.forEach((customization) => {
        if (!customization.optionData) {
          return;
        }

        dictionary[customization.id] = getLowestPriceForOptionValues(
          customization.optionData.values,
          productBySkuDictionary
        );
      });

      return dictionary;
    }
  );

  const totalPrice = computed<PriceHelper.ProductPrice>(() => {
    const productBySkuDictionary = root.$store.getters['product/getProductBySkuDictionary'];
    const selectedOptionValuesPrices: PriceHelper.ProductPrice[] = [];

    customizations.value.forEach((customization) => {
      if (!customization.optionData) {
        return;
      }

      if (!customization.optionData.values.length) {
        return;
      }
      const selectedValues = getCustomizationSelectedValues(
        customization,
        customizationState.value[customization.id]
      );
      const hasSelections = !!selectedValues && selectedValues.length;

      if (!hasSelections && !customization.optionData.isRequired) {
        return;
      }

      if (!hasSelections) {
        const lowestPrice = customizationOptionValuesLowestPrice.value[customization.id];

        if (lowestPrice) {
          selectedOptionValuesPrices.push(lowestPrice);
        }
      }

      if (!selectedValues) {
        return;
      }

      selectedValues.forEach((value) => {
        const price = getOptionValuePrice(value, productBySkuDictionary);

        if (price) {
          selectedOptionValuesPrices.push(price);
        }
      });
    });

    return PriceHelper.getTotalPriceForProductPrices(selectedOptionValuesPrices);
  });

  return {
    totalPrice
  };
}
