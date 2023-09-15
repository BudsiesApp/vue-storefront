import Product from 'core/modules/catalog/types/Product';

export function prepareProductCategories (product: Product) {
  if (!product.category || product.category.length === 0) {
    return '';
  }

  return product.category.map((category) => category.name).join('|');
}
