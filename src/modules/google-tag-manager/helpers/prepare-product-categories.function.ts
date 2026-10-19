import Product from 'core/modules/catalog/types/Product';

const categoryKeys = [
  'item_category',
  'item_category2',
  'item_category3',
  'item_category4',
  'item_category5'
] as const;

function categorySlug (category: Record<string, any>): string {
  const slug = typeof category.slug === 'string' ? category.slug : '';
  const id = category.category_id ?? category.id;

  if (id !== undefined && slug.endsWith(`-${id}`)) {
    return slug.slice(0, -String(id).length - 1);
  }

  return slug || String(category.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function prepareProductCategories (product: Product): Partial<Record<typeof categoryKeys[number], string>> {
  const categories = (product.category || []).filter(
    (category) => typeof category.name === 'string' && category.name.trim()
  );

  if (!categories.length) {
    return {};
  }

  const sorted = [...categories].sort((left, right) => {
    const leftDepth = typeof left.path === 'string' ? left.path.split('/').length : 0;
    const rightDepth = typeof right.path === 'string' ? right.path.split('/').length : 0;

    return rightDepth - leftDepth || String(left.category_id ?? left.id ?? '').localeCompare(
      String(right.category_id ?? right.id ?? '')
    );
  });
  const path = typeof sorted[0].path === 'string' ? sorted[0].path.split('/') : [];
  const used = new Set<Record<string, any>>();
  const names: string[] = [];

  for (const pathPart of path) {
    const category = sorted.find((candidate) => !used.has(candidate) && (
      pathPart === candidate.slug || pathPart === categorySlug(candidate)
    ));

    if (!category) {
      continue;
    }

    used.add(category);
    names.push(category.name.trim());
  }

  if (!names.length) {
    names.push(sorted[0].name.trim());
  }

  return Object.fromEntries(names.slice(0, categoryKeys.length).map((name, index) => [
    categoryKeys[index],
    name
  ]));
}
