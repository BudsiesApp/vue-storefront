import type Product from '@vue-storefront/core/modules/catalog/types/Product';
import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import { getCartItemPrice, getProductDefaultPrice } from '@vue-storefront/core/helpers/price';

jest.mock('@vue-storefront/core/filters', () => ({ price: jest.fn() }));
jest.mock('@vue-storefront/core/modules/catalog/helpers', () => ({
  isBundleProduct: (product: { type_id: string }) => product.type_id === 'bundle'
}));

interface PriceFixture {
  price: number,
  original: number,
  special?: number | null
}

function createSimple ({ price, original, special = null }: PriceFixture, qty?: number): Product {
  return {
    id: 10,
    sku: 'SIMPLE',
    type_id: 'simple',
    price_incl_tax: price,
    original_price_incl_tax: original,
    special_price: special,
    qty
  } as unknown as Product;
}

function createBundle (bundlePrice: PriceFixture, child: PriceFixture & { id: number }): Product {
  return {
    id: 1,
    sku: 'BUNDLE',
    type_id: 'bundle',
    price_incl_tax: bundlePrice.price,
    original_price_incl_tax: bundlePrice.original,
    special_price: bundlePrice.special ?? null,
    bundle_options: [{
      option_id: 1,
      required: true,
      product_links: [{
        id: 100,
        qty: 1,
        is_default: true,
        product: {
          id: child.id,
          price_incl_tax: child.price,
          original_price_incl_tax: child.original,
          special_price_incl_tax: child.special ?? null
        }
      }]
    }]
  } as unknown as Product;
}

describe('displayed product prices for every price source combination', () => {
  describe('simple products', () => {
    it.each([
      ['regular price only', { price: 17, original: 17 }, {}, { regular: 17, special: null }],
      ['non-zero special price', { price: 19.95, original: 24.95, special: 19.95 }, {}, { regular: 24.95, special: 19.95 }],
      ['zero special price', { price: 0, original: 36, special: 0 }, {}, { regular: 36, special: 0 }],
      ['non-zero discounted price without a special price', { price: 15, original: 15 }, { 10: { regular: 15, final: 10 } }, { regular: 15, special: 10 }],
      ['non-zero discounted price on top of a special price', { price: 20, original: 25, special: 20 }, { 10: { regular: 25, final: 15 } }, { regular: 25, special: 15 }],
      ['zero discounted price without a special price', { price: 15, original: 15 }, { 10: { regular: 15, final: 0 } }, { regular: 15, special: 0 }],
      ['zero discounted price on top of a special price', { price: 259, original: 359, special: 259 }, { 10: { regular: 359, final: 0 } }, { regular: 359, special: 0 }],
      ['discounted price equal to the regular price', { price: 179, original: 179 }, { 10: { regular: 179, final: 179 } }, { regular: 179, special: null }],
      ['non-numeric discounted price on top of a special price', { price: 7, original: 9, special: 7 }, { 10: { regular: 9, final: NaN } }, { regular: 9, special: 7 }]
    ])('shows the %s', (_, fixture, discountedPrices, expected) => {
      expect(getProductDefaultPrice(createSimple(fixture), discountedPrices)).toEqual(expected);
    });
  });

  describe('bundles priced by their default child', () => {
    it.each([
      ['child without special or discounted price', { price: 179, original: 179 }, { id: 20, price: 179, original: 179 }, {}, { regular: 179, special: null }],
      ['child with a non-zero special price', { price: 259, original: 359, special: 259 }, { id: 20, price: 259, original: 359, special: 259 }, {}, { regular: 359, special: 259 }],
      ['child with a non-zero discounted price on top of a special price', { price: 309, original: 409, special: 309 }, { id: 20, price: 309, original: 409, special: 309 }, { 20: { regular: 409, final: 300 } }, { regular: 409, special: 300 }],
      ['child with a zero discounted price on top of a special price', { price: 259, original: 359, special: 259 }, { id: 20, price: 259, original: 359, special: 259 }, { 20: { regular: 359, final: 0 } }, { regular: 359, special: 0 }],
      ['child with a zero discounted price without a special price', { price: 15, original: 15 }, { id: 20, price: 15, original: 15 }, { 20: { regular: 15, final: 0 } }, { regular: 15, special: 0 }]
    ])('shows the bundle with a %s', (_, bundlePrice, child, discountedPrices, expected) => {
      expect(getProductDefaultPrice(createBundle(bundlePrice, child), discountedPrices)).toEqual(expected);
    });
  });

  describe('cart items', () => {
    function createCartItem (itemTotals: Record<string, number> | undefined, qty: number, fixture: PriceFixture = { price: 0, original: 0 }): CartItem {
      return {
        ...createSimple(fixture, qty),
        extension_attributes: itemTotals ? { budsies_quote_item_totals: itemTotals } : {}
      } as unknown as CartItem;
    }

    it.each([
      ['no discount', { regular_price: 17, savings_amount: 0, final_price: 17 }, 2, { regular: 34, special: null }],
      ['a non-zero special price', { regular_price: 24.95, savings_amount: -5, final_price: 19.95 }, 2, { regular: 49.9, special: 39.9 }],
      ['a zero special or discounted price', { regular_price: 359, savings_amount: -359, final_price: 0 }, 2, { regular: 718, special: 0 }],
      ['a non-zero discounted price on top of a special price', { regular_price: 409, savings_amount: -109, final_price: 300 }, 2, { regular: 818, special: 600 }],
      ['a coupon discount on top of a special price', { regular_price: 24.95, savings_amount: -5, discount_amount: -1.995, final_price: 17.955 }, 2, { regular: 49.9, special: 35.91 }]
    ])('uses the server item totals for %s', (_, itemTotals, qty, expected) => {
      const price = getCartItemPrice(createCartItem(itemTotals, qty), {});

      expect(price.regular).toBeCloseTo(expected.regular, 6);
      expected.special === null
        ? expect(price.special).toBeNull()
        : expect(price.special).toBeCloseTo(expected.special, 6);
    });

    it.each([
      ['a zero discounted price', { price: 15, original: 15 }, { 10: { regular: 15, final: 0 } }, { regular: 30, special: 0 }],
      ['a non-zero discounted price', { price: 20, original: 25, special: 20 }, { 10: { regular: 25, final: 15 } }, { regular: 50, special: 30 }],
      ['a zero special price', { price: 0, original: 36, special: 0 }, {}, { regular: 72, special: 0 }]
    ])('falls back to catalog and discounted prices for %s without server item totals', (_, fixture, discountedPrices, expected) => {
      expect(getCartItemPrice(createCartItem(undefined, 2, fixture), discountedPrices)).toEqual(expected);
    });
  });
});
