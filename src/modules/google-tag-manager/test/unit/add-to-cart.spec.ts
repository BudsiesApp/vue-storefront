import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import VueGtm from '@gtm-support/vue2-gtm';
import itemActions from '@vue-storefront/core/modules/cart/store/actions/itemActions';
import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem';

import EventBusListener from '../../helpers/EventBusListener';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('config', () => ({}));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true,
  default: { $on: jest.fn(), $emit: jest.fn() }
}));
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: { error: jest.fn(() => jest.fn()), info: jest.fn(() => jest.fn()) }
}));
jest.mock('@vue-storefront/core/lib/multistore', () => ({
  currentStoreView: () => ({ name: 'Petsies' })
}));
jest.mock('@vue-storefront/core/modules/cart/helpers', () => ({
  prepareProductsToAdd: (product: Record<string, any>) => [{ ...product, category: undefined, category_ids: undefined }],
  productsEquals: (left: { sku: string }, right: { sku: string }) => left.sku === right.sku,
  validateProduct: jest.fn(() => []),
  createDiffLog: jest.fn(),
  notifications: {}
}));
jest.mock('@vue-storefront/core/modules/cart/helpers/throwServerErrorFromDiffLog', () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock('@vue-storefront/core/modules/cart', () => ({ GET_CART_ITEM_PRICE: 'cart/getCartItemPrice' }));
jest.mock('@vue-storefront/core/modules/catalog', () => ({ GET_PRODUCT_PRICE: 'product/getProductPrice' }));
jest.mock('@vue-storefront/core/modules/catalog/helpers', () => ({
  isBundleProduct: (product: { type_id: string }) => product.type_id === 'bundle'
}));
jest.mock('@vue-storefront/core/filters', () => ({ price: jest.fn() }));
jest.mock('@vue-storefront/core/modules/checkout', () => ({ ORDER_ERROR_EVENT: 'order-error' }));
jest.mock('src/modules/shared', () => ({
  PriceHelper: jest.requireActual('@vue-storefront/core/helpers/price'),
  DEFAULT_CURRENCY_CODE: 'USD',
  normalizeProductPurchaseFlow: () => 'standard',
  ProductEvent: {},
  UserEvents: {}
}));
jest.mock('src/modules/budsies', () => ({ PlushieWizardEvents: {} }));
jest.mock('src/modules/customization-system', () => ({ getSelectedOptionValuesByCustomizationState: () => [] }));
jest.mock('src/modules/a-b-testing', () => ({ A_B_TEST_GROUP_CHANGED: 'a-b-test-changed' }));
jest.mock('src/modules/orders-history', () => ({ FETCH_ORDERS_HISTORY_ACTION: 'orders-history/fetch' }));
jest.mock('src/modules/persisted-customer-data', () => ({ PERSISTED_CUSTOMER_DATA: 'persisted-customer-data' }));
jest.mock('src/modules/shared/helpers/get-cookie-by-name.function', () => ({ __esModule: true, default: () => null }));
jest.mock('storefront-query-builder', () => ({ SearchQuery: class {} }));

Vue.use(Vuex);

interface ItemTotals { regular_price: number, savings_amount: number, discount_amount: number, final_price: number }

describe('add_to_cart through the cart addItem action', () => {
  const pushes: Record<string, any>[] = [];
  const gtm = Object.assign(VueGtm, {
    dataLayer: jest.fn(() => pushes),
    trackEvent: jest.fn((payload) => pushes.push(payload))
  });
  const store = new Store<any>({
    state: {
      cart: { cartItems: [], platformTotals: { quote_currency_code: 'USD' }, productDiscountedPrice: {} },
      product: { productDiscountedPrice: {} },
      user: { current: null }
    },
    getters: {
      'cart/getCartItems': (state) => state.cart.cartItems,
      'cart/getCartItemPrice': () => () => ({ regular: 999, special: null })
    }
  });
  const category = [{ category_id: 4, name: 'Plushies', slug: 'plushies-4', path: 'plushies/plushies-4' }];

  new EventBusListener(store, gtm).initEventBusListeners();

  function createProduct (qty: number): CartItem {
    return {
      sku: 'PLUSH-1',
      id: 42,
      name: 'Plushie',
      type_id: 'simple',
      qty,
      price: 80,
      price_incl_tax: 96,
      original_price: 100,
      original_price_incl_tax: 120,
      special_price: 80,
      regular_price: 120,
      category
    } as unknown as CartItem;
  }

  async function addToCart (product: CartItem, itemTotals?: ItemTotals, serverResponses: Record<string, any>[] = []) {
    const context = {
      commit: jest.fn(),
      dispatch: jest.fn(async (name: string, { productsToAdd }: { productsToAdd: CartItem[] }) => {
        if (name !== 'addItems') {
          return;
        }

        for (const productToAdd of productsToAdd) {
          const line = store.state.cart.cartItems.find((item: CartItem) => item.sku === productToAdd.sku);

          if (line) {
            line.qty += productToAdd.qty;
            continue;
          }

          store.state.cart.cartItems.push({
            ...productToAdd,
            server_item_id: 7,
            extension_attributes: itemTotals ? { budsies_quote_item_totals: itemTotals } : {}
          });
        }

        return { serverResponses };
      })
    };

    pushes.length = 0;
    await (itemActions as any).addItem(context, { productToAdd: product });

    return pushes.find(({ event }) => event === 'add_to_cart');
  }

  beforeEach(() => {
    store.state.cart.cartItems = [];
  });

  it('reports an undiscounted product added with quantity two', async () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };

    expect(await addToCart(createProduct(2), itemTotals)).toMatchObject({
      ecommerce: { value: 200, items: [{ item_id: 'PLUSH-1', price: 100, discount: 0, quantity: 2 }] }
    });
  });

  it('reports synchronized net amounts for a discounted taxed product', async () => {
    const itemTotals = { regular_price: 100, savings_amount: -20, discount_amount: 0, final_price: 80 };

    expect(await addToCart(createProduct(1), itemTotals)).toMatchObject({
      ecommerce: { value: 80, items: [{ price: 80, discount: 20, quantity: 1 }] }
    });
  });

  it('falls back to net product prices when the line has no item totals', async () => {
    expect(await addToCart(createProduct(1))).toMatchObject({
      ecommerce: { items: [{ price: 80, discount: 20, quantity: 1 }] }
    });
  });

  it('reports only the added quantity for an existing line', async () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: -10, final_price: 90 };

    await addToCart(createProduct(3), itemTotals);

    expect(await addToCart(createProduct(1), itemTotals)).toMatchObject({
      ecommerce: { value: 90, items: [{ price: 90, discount: 10, quantity: 1 }] }
    });
    expect(store.state.cart.cartItems[0].qty).toBe(4);
  });

  it('does not report an item that the server rejected', async () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };
    const rejected = [{ status: 500, sku: 'PLUSH-1', result: 'Provided email is not valid' }];

    expect(await addToCart(createProduct(1), itemTotals, rejected)).toBeUndefined();
  });

  it('reports an item when every server response succeeded', async () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };
    const accepted = [{ status: 200, sku: 'PLUSH-1', result: {} }];

    expect(await addToCart(createProduct(1), itemTotals, accepted)).toMatchObject({ event: 'add_to_cart' });
  });

  it('reports the categories of the added product', async () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };

    expect(store.state.cart.cartItems).toHaveLength(0);
    expect(await addToCart(createProduct(1), itemTotals)).toMatchObject({
      ecommerce: { items: [{ item_category: 'Plushies' }] }
    });
    expect(store.state.cart.cartItems[0].category).toBeUndefined();
  });
});
