import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import { getCartItemPrice } from '@vue-storefront/core/helpers/price';

jest.mock('@vue-storefront/core/filters', () => ({ price: jest.fn() }));
jest.mock('@vue-storefront/core/modules/catalog/helpers', () => ({
  isBundleProduct: (product: { type_id: string }) => product.type_id === 'bundle'
}));

interface ItemTotals {
  regular_price: number,
  savings_amount?: number,
  discount_amount?: number,
  final_price: number
}

function createItem (itemTotals: ItemTotals, qty = 1, typeId = 'simple'): CartItem {
  return {
    sku: 'ITEM',
    type_id: typeId,
    qty,
    extension_attributes: { budsies_quote_item_totals: itemTotals }
  } as unknown as CartItem;
}

describe('getCartItemPrice with custom item totals', () => {
  it.each([
    ['no discount', { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 }, { regular: 100, special: null }],
    ['a sale price', { regular_price: 100, savings_amount: -10, discount_amount: 0, final_price: 90 }, { regular: 100, special: 90 }],
    ['a coupon', { regular_price: 100, savings_amount: 0, discount_amount: -10, final_price: 90 }, { regular: 100, special: 90 }],
    ['a sale price and a coupon', { regular_price: 100, savings_amount: -10, discount_amount: -10, final_price: 80 }, { regular: 100, special: 80 }],
    ['a paid option', { regular_price: 100, savings_amount: 25, discount_amount: 0, final_price: 125 }, { regular: 125, special: null }],
    ['a paid option and a coupon', { regular_price: 100, savings_amount: 25, discount_amount: -10, final_price: 115 }, { regular: 125, special: 115 }]
  ])('prices a simple item with %s', (_, itemTotals, expected) => {
    expect(getCartItemPrice(createItem(itemTotals), {})).toEqual(expected);
  });

  it('prices a dynamic bundle with discounted children', () => {
    const itemTotals = { regular_price: 150, savings_amount: -30, discount_amount: -12, final_price: 108 };

    expect(getCartItemPrice(createItem(itemTotals, 1, 'bundle'), {})).toEqual({ regular: 150, special: 108 });
  });

  it('prices a gift card', () => {
    const itemTotals = { regular_price: 50, savings_amount: 0, discount_amount: 0, final_price: 50 };

    expect(getCartItemPrice(createItem(itemTotals, 1, 'amgiftcard'), {})).toEqual({ regular: 50, special: null });
  });

  it('does not cap the paid price when the savings amount is missing', () => {
    expect(getCartItemPrice(createItem({ regular_price: 100, final_price: 125 }), {})).toEqual({ regular: 125, special: null });
    expect(getCartItemPrice(createItem({ regular_price: 100, final_price: 90 }), {})).toEqual({ regular: 100, special: 90 });
  });

  it('multiplies unit prices by quantity', () => {
    const itemTotals = { regular_price: 100, savings_amount: 25, discount_amount: -10, final_price: 115 };

    expect(getCartItemPrice(createItem(itemTotals, 3), {})).toEqual({ regular: 375, special: 345 });
  });
});
