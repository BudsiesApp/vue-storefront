import { createSimpleProduct } from '@vue-storefront/core/modules/catalog/test/helpers/createProduct';

import { prepareProductCategories } from '../../helpers/prepare-product-categories.function';

describe('GA4 item categories', () => {
  it('reports the first assigned category as the only category level', () => {
    const product = { ...createSimpleProduct(),
      category: [
        { category_id: 9, name: 'Accessories for Custom Products', position: 3 },
        { category_id: 11, name: 'Petsies Accessories', position: 1 }
      ]
    };

    expect(prepareProductCategories(product)).toEqual({ item_category: 'Accessories for Custom Products' });
  });

  it('skips categories without a name and trims the reported name', () => {
    const product = { ...createSimpleProduct(),
      category: [
        { category_id: 6, name: '  ' },
        { category_id: 13, name: ' Forevers Plush ' }
      ]
    };

    expect(prepareProductCategories(product)).toEqual({ item_category: 'Forevers Plush' });
  });

  it('omits the category when none is assigned', () => {
    expect(prepareProductCategories({ ...createSimpleProduct(), category: [] })).toEqual({});
    expect(prepareProductCategories({ ...createSimpleProduct(), category: undefined })).toEqual({});
  });
});
