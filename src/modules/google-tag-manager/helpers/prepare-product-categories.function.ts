import Product from 'core/modules/catalog/types/Product';

export function prepareProductCategories (product: Product): { item_category?: string } {
  const category = (product.category || []).find(
    (category) => typeof category.name === 'string' && category.name.trim()
  );

  if (!category) {
    return {};
  }

  return { item_category: category.name.trim() };
}
