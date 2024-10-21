import Product from 'core/modules/catalog/types/Product';
import { PriceHelper } from 'src/modules/shared';

import { prepareBaseItemData } from './prepare-base-item-data.function';

export function prepareProductItemData (
  product: Product,
  price: PriceHelper.ProductPrice
) {
  const baseData = prepareBaseItemData(product);

  return {
    ...baseData,
    discount: PriceHelper.getProductDiscount(price),
    price: PriceHelper.getFinalPrice(price)
  }
}
