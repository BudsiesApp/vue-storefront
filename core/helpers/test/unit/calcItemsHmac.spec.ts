import { calcItemsHmac } from '@vue-storefront/core/helpers/calc-items-hmac';

describe('calcItemsHmac', () => {
  const item = {
    sku: 'PLUSH-1',
    qty: 1,
    product_option: { extension_attributes: { bundle_options: [{ option_id: 1, option_qty: 1, option_selections: [2] }] } },
    extension_attributes: { plushie_id: '15', customization_state: [{ customization_id: '1', value: '2' }] }
  };
  const hash = calcItemsHmac([item], 'quote');

  it('ignores catalog data refreshed after synchronization', () => {
    const refreshed = {
      ...item,
      category: [{ category_id: 4, name: 'Plushies' }],
      category_ids: [4],
      description: 'Loaded later',
      media_gallery: [{ image: '/a.png' }],
      price_incl_tax: 100,
      bundle_options: [{ option_id: 1, product_links: [] }],
      stock: { is_in_stock: true },
      totals: { row_total: 100 }
    };

    expect(calcItemsHmac([refreshed], 'quote')).toBe(hash);
  });

  it.each([
    ['quantity', { qty: 2 }],
    ['sku', { sku: 'PLUSH-2' }],
    ['selected options', { product_option: { extension_attributes: { bundle_options: [] } } }],
    ['customization state', { extension_attributes: { plushie_id: '15', customization_state: [] } }]
  ])('changes when the %s changes', (_name, change) => {
    expect(calcItemsHmac([{ ...item, ...change }], 'quote')).not.toBe(hash);
  });

  it('changes with the cart token', () => {
    expect(calcItemsHmac([item], 'other-quote')).not.toBe(hash);
  });
});
