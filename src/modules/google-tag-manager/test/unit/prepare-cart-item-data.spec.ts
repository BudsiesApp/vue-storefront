import type { Store } from 'vuex';
import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import type RootState from '@vue-storefront/core/types/RootState';
import { createSimpleProduct } from '@vue-storefront/core/modules/catalog/test/helpers/createProduct';

import { prepareCartItemData } from '../../helpers/prepare-cart-item-data.function';

jest.mock('@vue-storefront/core/lib/multistore', () => ({ currentStoreView: () => ({ name: 'Petsies' }) }));
jest.mock('@vue-storefront/core/modules/catalog/helpers', () => ({
  isBundleProduct: (product: { type_id: string }) => product.type_id === 'bundle'
}));
jest.mock('@vue-storefront/core/filters', () => ({ price: jest.fn() }));
jest.mock('src/modules/shared', () => ({
  PriceHelper: jest.requireActual('@vue-storefront/core/helpers/price'),
  normalizeProductPurchaseFlow: () => 'standard'
}));
jest.mock('src/modules/customization-system', () => ({ getSelectedOptionValuesByCustomizationState: () => [] }));

describe('GA4 cart item mapping with the existing price helper', () => {
  const storeStub = { state: { cart: { productDiscountedPrice: {} } } };
  const store = storeStub as Store<RootState>;

  function createItem (regular = 120, final = 90): CartItem {
    const item = {
      ...createSimpleProduct(),
      qty: 2,
      price: 100,
      price_incl_tax: 120,
      totals: { row_total: 200, discount_amount: 0 },
      extension_attributes: { budsies_quote_item_totals: { regular_price: regular, final_price: final } }
    };

    return item as CartItem;
  }

  it.each(['simple', 'bundle'])('uses custom paid %s prices despite conflicting standard totals', (type) => {
    const item = { ...createItem(), type_id: type };

    expect(prepareCartItemData(item, store)).toMatchObject({
      price: 90,
      discount: 30,
      quantity: 2
    });
  });

  it('keeps the precision of an allocated coupon discount', () => {
    const item = { ...createItem(10, 10 - 1 / 3), qty: 3 };
    const mapped = prepareCartItemData(item, store);

    expect(mapped.price * item.qty).toBeCloseTo(29);
    expect(mapped.discount * item.qty).toBeCloseTo(1);
  });

  it.each([100, 0])('reports an undiscounted unit price of %s with a numeric zero discount', (amount) => {
    expect(prepareCartItemData(createItem(amount, amount), store)).toMatchObject({
      price: amount,
      discount: 0
    });
  });

  it('reuses the existing helper fallback when custom totals are unavailable', () => {
    const product = {
      ...createSimpleProduct(),
      qty: 1,
      price: 100,
      price_incl_tax: 100,
      original_price_incl_tax: 120,
      regular_price: 120,
      special_price: 100
    };
    const item = product as CartItem;

    expect(prepareCartItemData(item, store)).toMatchObject({ price: 100, discount: 20 });
  });

  it('avoids division by zero for an item with zero quantity', () => {
    expect(prepareCartItemData({ ...createItem(), qty: 0 }, store)).toMatchObject({ price: 0, discount: 0 });
  });
});
