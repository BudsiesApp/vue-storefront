import Product from 'core/modules/catalog/types/Product';
import { getFinalPrice, getProductDefaultDiscount, getProductDefaultPrice } from 'src/modules/shared/helpers/price';

import { prepareBaseItemData } from './prepare-base-item-data.function';

export function prepareProductItemData (product: Product) {
  const price = getProductDefaultPrice(product, {}, false);
  const baseData = prepareBaseItemData(product);

  return {
    ...baseData,
    discount: getProductDefaultDiscount(product, false, false),
    price: getFinalPrice(price)
  }
}
