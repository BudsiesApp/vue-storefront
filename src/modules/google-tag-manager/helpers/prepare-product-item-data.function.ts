import Product from 'core/modules/catalog/types/Product';
import { PriceHelper } from 'src/modules/shared';

import { prepareBaseItemData } from './prepare-base-item-data.function';

export function prepareProductItemData (
  product: Product,
  productPriceDictionary: Record<string, PriceHelper.ProductPrice>,
  productDiscountDictionary: Record<string, PriceHelper.ProductDiscount>
) {
  const price = productPriceDictionary[product.id];
  const baseData = prepareBaseItemData(product);

  return {
    ...baseData,
    discount: productDiscountDictionary[product.id] || 0,
    price: price ? PriceHelper.getFinalPrice(price) : product.price
  }
}
