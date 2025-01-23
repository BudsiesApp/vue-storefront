import { PriceHelper } from 'src/modules/shared';

import { getOptionValuePrice } from './get-option-value-price';
import { OptionValue } from '../types/option-value.interface';

export function getLowestPriceForOptionValues (
  optionValues: OptionValue[]
): PriceHelper.ProductPrice | undefined {
  let lowestPrice: number | undefined;
  let lowestProductPrice: PriceHelper.ProductPrice | undefined;

  optionValues.forEach((optionValue) => {
    const price = getOptionValuePrice(optionValue);

    if (!price) {
      return;
    }

    const finalProductPrice = PriceHelper.getFinalPrice(price);

    if (lowestPrice === undefined || finalProductPrice < lowestPrice) {
      lowestPrice = finalProductPrice;
      lowestProductPrice = price;
    }
  });

  return lowestProductPrice;
}
