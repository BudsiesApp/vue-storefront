import type { ProductDiscountedPrice } from '@vue-storefront/core/modules/catalog';
import * as PriceHelper from '@vue-storefront/core/helpers/price';

import { getOptionValuePrice } from './get-option-value-price';
import { OptionValue } from '../types/option-value.interface';

export function getLowestPriceForOptionValues (
  optionValues: OptionValue[],
  productDiscountedPriceDictionary: Record<string, ProductDiscountedPrice> = {},
  exchangeRate = 1
): PriceHelper.ProductPrice | undefined {
  let lowestPrice: number | undefined;
  let lowestProductPrice: PriceHelper.ProductPrice | undefined;

  optionValues.forEach((optionValue) => {
    if (!optionValue.isEnabled) {
      return;
    }

    const price = getOptionValuePrice(optionValue, productDiscountedPriceDictionary, exchangeRate);

    const finalProductPrice = PriceHelper.getFinalPrice(price);

    if (lowestPrice === undefined || finalProductPrice < lowestPrice) {
      lowestPrice = finalProductPrice;
      lowestProductPrice = price;
    }
  });

  return lowestProductPrice;
}
