import type Product from '@vue-storefront/core/modules/catalog/types/Product';
import { getProductDefaultPrice } from '@vue-storefront/core/helpers/price';

jest.mock('@vue-storefront/core/filters', () => ({ price: jest.fn() }));
jest.mock('@vue-storefront/core/modules/catalog/helpers', () => ({
  isBundleProduct: (product: { type_id: string }) => product.type_id === 'bundle'
}));

function createUpgrade (): Product {
  return {
    id: 156,
    sku: 'memory_pocket',
    type_id: 'simple',
    price_incl_tax: 15,
    original_price_incl_tax: 15,
    special_price: null
  } as unknown as Product;
}

describe('getProductDefaultPrice with discounted prices', () => {
  it('shows a free upgrade when its discounted price is zero', () => {
    expect(getProductDefaultPrice(createUpgrade(), { 156: { regular: 15, final: 0 } })).toEqual({ regular: 15, special: 0 });
  });

  it('shows a non-zero discounted price as the special price', () => {
    expect(getProductDefaultPrice(createUpgrade(), { 156: { regular: 15, final: 10 } })).toEqual({ regular: 15, special: 10 });
  });

  it('keeps the regular price without a discounted price', () => {
    expect(getProductDefaultPrice(createUpgrade(), {})).toEqual({ regular: 15, special: null });
  });

  it('shows a bundle with a free discounted default child as free', () => {
    const bundle = {
      id: 73,
      sku: 'ForeversDog_bundle',
      type_id: 'bundle',
      price_incl_tax: 259,
      original_price_incl_tax: 359,
      special_price: 259,
      bundle_options: [{
        option_id: 26,
        required: true,
        product_links: [{
          id: 460,
          qty: 1,
          is_default: true,
          product: { id: 453, price_incl_tax: 259, original_price_incl_tax: 359, special_price_incl_tax: 259 }
        }]
      }]
    } as unknown as Product;

    expect(getProductDefaultPrice(bundle, { 453: { regular: 359, final: 0 } })).toEqual({ regular: 359, special: 0 });
  });
});
