import { createSimpleProduct } from '@vue-storefront/core/modules/catalog/test/helpers/createProduct';

import { prepareProductCategories } from '../../helpers/prepare-product-categories.function';

describe('GA4 item categories', () => {
  it('uses known ancestry in category path order, regardless of product category order', () => {
    const product = { ...createSimpleProduct(),
      category: [
        { category_id: 5, name: 'Fitness Equipment', slug: 'fitness-equipment-5', path: 'gear/fitness-equipment/fitness-equipment-5' },
        { category_id: 3, name: 'Gear', slug: 'gear-3', path: 'gear/gear-3' }
      ]
    };

    expect(prepareProductCategories(product)).toEqual({
      item_category: 'Gear',
      item_category2: 'Fitness Equipment'
    });
  });

  it('does not invent ancestry between unrelated categories', () => {
    const product = { ...createSimpleProduct(),
      category: [
        { category_id: 10, name: 'Toys', slug: 'toys-10', path: 'toys/toys-10' },
        { category_id: 20, name: 'Gifts', slug: 'gifts-20', path: 'gifts/gifts-20' }
      ]
    };

    expect(prepareProductCategories(product)).toEqual({ item_category: 'Toys' });
  });

  it('reports at most five known category levels', () => {
    const names = ['Gifts', 'Plushies', 'Pets', 'Dogs', 'Portraits', 'Limited'];
    const category = names.map((name, index) => ({
      category_id: index + 1,
      name,
      slug: `${name.toLowerCase()}-${index + 1}`,
      path: names.slice(0, index + 1).map((part) => part.toLowerCase()).join('/') + `/${name.toLowerCase()}-${index + 1}`
    }));

    expect(prepareProductCategories({ ...createSimpleProduct(), category })).toEqual({
      item_category: 'Gifts',
      item_category2: 'Plushies',
      item_category3: 'Pets',
      item_category4: 'Dogs',
      item_category5: 'Portraits'
    });
  });

  it('omits unknown category levels', () => {
    expect(prepareProductCategories({ ...createSimpleProduct(), category: [] })).toEqual({});
    expect(prepareProductCategories({ ...createSimpleProduct(), category: [{ name: 'Toys' }] })).toEqual({
      item_category: 'Toys'
    });
  });
});
