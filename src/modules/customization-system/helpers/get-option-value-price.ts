import dayjs from 'dayjs';

import type { ProductDiscountedPrice } from '@vue-storefront/core/modules/catalog/types/product-discounted-price.interface';
import type { ProductPrice } from '@vue-storefront/core/helpers/price';

import type { OptionValue } from '../types/option-value.interface';

export function getOptionValuePrice (
  optionValue: OptionValue,
  productDiscountedPriceDictionary: Record<string, ProductDiscountedPrice> = {},
  exchangeRate = 1
): ProductPrice {
  const adjustment = optionValue.productId == null
    ? undefined
    : productDiscountedPriceDictionary[optionValue.productId];
  const regular = adjustment?.regular ?? optionValue.price ?? 0;
  const now = dayjs();
  const fromDate = optionValue.specialPriceFromDate ? dayjs(optionValue.specialPriceFromDate) : null;
  const toDate = optionValue.specialPriceToDate ? dayjs(optionValue.specialPriceToDate) : null;
  const isSpecialActive = (!fromDate || (fromDate.isValid() && !now.isBefore(fromDate))) &&
    (!toDate || (toDate.isValid() && !now.isAfter(toDate)));
  const final = adjustment?.final ?? (isSpecialActive ? optionValue.specialPrice : null) ?? optionValue.price ?? 0;

  return {
    regular: regular * exchangeRate,
    special: final < regular ? final * exchangeRate : null
  };
}
