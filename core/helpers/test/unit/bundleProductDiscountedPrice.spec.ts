import type Product from '@vue-storefront/core/modules/catalog/types/Product';
import {
  getBundleCartItemDiscountedPrice,
  getBundleProductDefaultDiscountedPrice
} from '@vue-storefront/core/helpers/bundle-product-discounted-price';

function createChild (id: number, priceInclTax: number, originalPriceInclTax = priceInclTax, specialPriceInclTax = 0) {
  return {
    id,
    sku: `CHILD-${id}`,
    price_incl_tax: priceInclTax,
    original_price_incl_tax: originalPriceInclTax,
    special_price_incl_tax: specialPriceInclTax
  } as unknown as Product;
}

function createBundle (links: { id: number, qty: number, product: Product }[]): Product {
  return {
    id: 1,
    sku: 'BUNDLE',
    type_id: 'bundle',
    bundle_options: links.map((link, index) => ({
      option_id: index + 1,
      required: true,
      product_links: [{ ...link, option_id: index + 1, is_default: true }]
    }))
  } as unknown as Product;
}

describe('bundle discounted prices', () => {
  it('keeps a zero discounted final price of a default child', () => {
    const bundle = createBundle([{ id: 11, qty: 1, product: createChild(10, 96, 120) }]);

    expect(getBundleProductDefaultDiscountedPrice(bundle, { 10: { regular: 120, final: 0 } })).toEqual({ regular: 120, final: 0 });
  });

  it('multiplies child prices by the selection quantity', () => {
    const bundle = createBundle([{ id: 11, qty: 2, product: createChild(10, 40) }]);

    expect(getBundleProductDefaultDiscountedPrice(bundle, { 10: { regular: 40, final: 30 } })).toEqual({ regular: 80, final: 60 });
  });

  it('uses own prices of children without a discounted price in a mixed bundle', () => {
    const bundle = createBundle([
      { id: 11, qty: 1, product: createChild(10, 50) },
      { id: 21, qty: 3, product: createChild(20, 9, 12) }
    ]);

    expect(getBundleProductDefaultDiscountedPrice(bundle, { 10: { regular: 50, final: 0 } })).toEqual({
      regular: 50 + 12 * 3,
      final: 0 + 9 * 3
    });
  });

  it('uses the current price of a child without a special price', () => {
    const bundle = createBundle([
      { id: 11, qty: 1, product: createChild(10, 50) },
      { id: 21, qty: 1, product: createChild(20, 30, 30, 0) }
    ]);

    expect(getBundleProductDefaultDiscountedPrice(bundle, { 10: { regular: 50, final: 40 } })).toEqual({ regular: 80, final: 70 });
  });

  it('keeps a child with a real special price of zero free', () => {
    const freeChild = { id: 20, sku: 'CHILD-20', price_incl_tax: 0, original_price_incl_tax: 36, special_price: 0, special_price_incl_tax: 0 } as unknown as Product;
    const bundle = createBundle([
      { id: 11, qty: 1, product: createChild(10, 50) },
      { id: 21, qty: 1, product: freeChild }
    ]);

    expect(getBundleProductDefaultDiscountedPrice(bundle, { 10: { regular: 50, final: 40 } })).toEqual({ regular: 86, final: 40 });
  });

  it.each([
    ['missing', undefined],
    ['zero', 0],
    ['negative', -1],
    ['non-numeric', 'two'],
    ['partially numeric', '2items'],
    ['empty', '']
  ])('uses a selection quantity of one when it is %s', (_, qty) => {
    const bundle = createBundle([{ id: 11, qty: 1, product: createChild(10, 40) }]);
    const cartItem = {
      ...bundle,
      product_option: { extension_attributes: { bundle_options: { 1: { option_id: 1, option_qty: qty, option_selections: [11] } } } }
    } as unknown as Product;

    expect(getBundleCartItemDiscountedPrice(cartItem, { 10: { regular: 40, final: 30 } })).toEqual({ regular: 40, final: 30 });
  });

  it.each([
    ['integer', '2'],
    ['decimal', '2.0000']
  ])('applies a selection quantity given as a %s string', (_, qty) => {
    const bundle = createBundle([{ id: 11, qty: 1, product: createChild(10, 40) }]);
    const cartItem = {
      ...bundle,
      product_option: { extension_attributes: { bundle_options: { 1: { option_id: 1, option_qty: qty, option_selections: [11] } } } }
    } as unknown as Product;

    expect(getBundleCartItemDiscountedPrice(cartItem, { 10: { regular: 40, final: 30 } })).toEqual({ regular: 80, final: 60 });
  });

  it('returns no discounted price when no child has one', () => {
    const bundle = createBundle([{ id: 11, qty: 1, product: createChild(10, 50) }]);

    expect(getBundleProductDefaultDiscountedPrice(bundle, {})).toBeUndefined();
  });

  it('applies the selected quantity of a bundle cart item', () => {
    const bundle = createBundle([{ id: 11, qty: 1, product: createChild(10, 40) }]);
    const cartItem = {
      ...bundle,
      product_option: { extension_attributes: { bundle_options: { 1: { option_id: 1, option_qty: 2, option_selections: [11] } } } }
    } as unknown as Product;

    expect(getBundleCartItemDiscountedPrice(cartItem, { 10: { regular: 40, final: 0 } })).toEqual({ regular: 80, final: 0 });
  });
});
