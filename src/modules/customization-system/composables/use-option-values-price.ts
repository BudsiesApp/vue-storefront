import { Ref, computed, SetupContext } from '@vue/composition-api';

import Product from '@vue-storefront/core/modules/catalog/types/Product';
import { PriceHelper } from 'src/modules/shared';

import { OptionValue } from '../types/option-value.interface';

function getOptionValuePrice (
  optionValue: OptionValue,
  productBySkuDictionary: Record<string, Product>
): PriceHelper.ProductPrice | undefined {
  const defaultOptionValuePrice = optionValue.price
    ? {
      regular: optionValue.price,
      special: null
    }
    : undefined

  if (!optionValue.sku) {
    return defaultOptionValuePrice;
  }

  const product = productBySkuDictionary[optionValue.sku];

  if (!product) {
    return defaultOptionValuePrice;
  }

  return PriceHelper.getCartItemPrice(product, {}, false);
}

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
