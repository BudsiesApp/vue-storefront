import Product from '@vue-storefront/core/modules/catalog/types/Product';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'

import { PriceHelper } from 'src/modules/shared';
import UpdateProductDiscountPriceEventData from 'src/modules/shared/types/discount-price/update-product-discount-price-event-data.interface';
import { UPDATE_PRODUCT_DEFAULT_DISCOUNT_PRICE_DATA_EVENT_ID } from 'src/modules/shared/types/discount-price/events';

import { OptionValue } from '../types/option-value.interface';
import { getOptionValueSpecialPrice } from './get-option-value-special-price.function';

export function getOptionValuePrice (
  optionValue: OptionValue
): PriceHelper.ProductPrice | undefined {
  const defaultPrice = {
    regular: optionValue.price !== undefined
      ? optionValue.price
      : 0,
    special: getOptionValueSpecialPrice(optionValue)
  }

  if (optionValue.productId === undefined) {
    return defaultPrice;
  }

  const productDiscountPriceData: UpdateProductDiscountPriceEventData = {
    value: undefined,
    product: {
      id: optionValue.productId
    }
  };

  EventBus.$emit(UPDATE_PRODUCT_DEFAULT_DISCOUNT_PRICE_DATA_EVENT_ID, productDiscountPriceData);

  if (productDiscountPriceData.value === undefined) {
    return defaultPrice;
  }

  if (defaultPrice.special === null || defaultPrice.special < productDiscountPriceData.value) {
    return defaultPrice;
  }

  return {
    regular: defaultPrice.regular,
    special: productDiscountPriceData.value
  }
}
