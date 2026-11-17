import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import VueGtm from '@gtm-support/vue2-gtm';
import config from 'config';
import { DiffLog } from '@vue-storefront/core/modules/cart/helpers/createDiffLog';
import itemActions from '@vue-storefront/core/modules/cart/store/actions/itemActions';
import * as cartMutationTypes from '@vue-storefront/core/modules/cart/store/mutation-types';
import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem';

import EventBusListener from '../../helpers/EventBusListener';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('config', () => ({ stock: { allowOutOfStockInCart: true } }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true,
  default: { $on: jest.fn(), $emit: jest.fn() }
}));
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: { error: jest.fn(() => jest.fn()), info: jest.fn(() => jest.fn()) }
}));
jest.mock('@vue-storefront/core/lib/multistore', () => ({
  currentStoreView: () => ({ name: 'Petsies' }),
  localizedRoute: jest.fn()
}));
jest.mock('@vue-storefront/core/app', () => ({ router: { push: jest.fn() } }));
jest.mock('@vue-storefront/i18n', () => ({ __esModule: true, default: { t: (text: string) => text } }));
// The diff log, notifications and validation are the real ones, so `addItems` decides what was accepted.
jest.mock('@vue-storefront/core/modules/cart/helpers', () => ({
  prepareProductsToAdd: (product: Record<string, any>) => [{ ...product, category: undefined, category_ids: undefined }],
  productsEquals: (left: { sku: string }, right: { sku: string }) => left.sku === right.sku,
  validateProduct: jest.requireActual('@vue-storefront/core/modules/cart/helpers/validateProduct').default,
  createDiffLog: () => new (jest.requireActual('@vue-storefront/core/modules/cart/helpers/createDiffLog').DiffLog)(),
  notifications: jest.requireActual('@vue-storefront/core/modules/cart/helpers/notifications')
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
  const cartItemPriceGetter = jest.fn(() => ({ regular: 999, special: null }));
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
      'cart/getCartItemPrice': () => cartItemPriceGetter
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

  // Runs the real `addItem` and `addItems` actions; only the stock check, the cart mutation and the
  // server synchronization are replaced.
  async function addToCart (
    product: CartItem,
    itemTotals?: ItemTotals,
    serverResponses: Record<string, any>[] = [],
    stockStatus = 'ok'
  ) {
    const context: any = {
      getters: { isCartConnected: true, isCartSyncEnabled: true, getPendingCouponCode: null },
      commit: (type: string, { product: addedProduct }: { product?: CartItem } = {}) => {
        if (type !== cartMutationTypes.CART_ADD_ITEM || !addedProduct) {
          return;
        }

        const line = store.state.cart.cartItems.find((item: CartItem) => item.sku === addedProduct.sku);

        if (line) {
          line.qty += addedProduct.qty;
          return;
        }

        store.state.cart.cartItems.push({
          ...addedProduct,
          server_item_id: 7,
          extension_attributes: itemTotals ? { budsies_quote_item_totals: itemTotals } : {}
        });
      },
      dispatch: jest.fn(async (name: string, payload: Record<string, any>) => {
        switch (name) {
          case 'addItems':
            return (itemActions as any).addItems(context, payload);
          case 'checkProductStatus':
            return { status: stockStatus, onlineCheckTaskId: 1 };
          case 'sync': {
            const diffLog = new DiffLog();

            serverResponses.forEach((response) => diffLog.pushServerResponse(response as any));

            return diffLog;
          }
          default:
            return undefined;
        }
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
      ecommerce: { value: 999, items: [{ item_id: 'PLUSH-1', price: 100, discount: 0, quantity: 2 }] }
    });
  });

  it('reports synchronized net amounts for a discounted taxed product', async () => {
    const itemTotals = { regular_price: 100, savings_amount: -20, discount_amount: 0, final_price: 80 };

    expect(await addToCart(createProduct(1), itemTotals)).toMatchObject({
      ecommerce: { value: 999, items: [{ price: 80, discount: 20, quantity: 1 }] }
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
      ecommerce: { value: 999, items: [{ price: 90, discount: 10, quantity: 1 }] }
    });
    expect(store.state.cart.cartItems[0].qty).toBe(4);
  });

  it('keeps the cart item price getter of the added product as the event value source', async () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };
    const product = createProduct(2);

    cartItemPriceGetter.mockClear();

    expect(await addToCart(product, itemTotals)).toMatchObject({ ecommerce: { value: 999 } });
    expect(cartItemPriceGetter).toHaveBeenCalledWith(product);
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

  describe('when the cart rejects the add locally', () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };

    it('does not report an item that is out of stock', async () => {
      expect(await addToCart(createProduct(1), itemTotals, [], 'out_of_stock')).toBeUndefined();
      expect(store.state.cart.cartItems).toHaveLength(0);
    });

    it('does not report a quantity increase of an existing line that is out of stock', async () => {
      expect(await addToCart(createProduct(1), itemTotals)).toMatchObject({ event: 'add_to_cart' });
      expect(await addToCart(createProduct(1), itemTotals, [], 'out_of_stock')).toBeUndefined();
      expect(store.state.cart.cartItems[0].qty).toBe(1);
    });

    it('does not report a product that fails the cart validation', async () => {
      const productWithoutPrice: CartItem = { ...createProduct(1), price_incl_tax: 0 };

      expect(await addToCart(productWithoutPrice, itemTotals)).toBeUndefined();
      expect(store.state.cart.cartItems).toHaveLength(0);
    });

    it('reports an item that was added with only a stock warning', async () => {
      const stockConfig = (config as any).stock;

      stockConfig.allowOutOfStockInCart = false;

      try {
        expect(await addToCart(createProduct(1), itemTotals, [], 'volatile')).toMatchObject({ event: 'add_to_cart' });
        expect(store.state.cart.cartItems).toHaveLength(1);
      } finally {
        stockConfig.allowOutOfStockInCart = true;
      }
    });
  });

  describe('when the line has no item totals', () => {
    // The default child costs 80 (regular 100); the selected child costs 120 (regular 140).
    function createBundle (selectedChildId: number): CartItem {
      const createChild = (id: number, paid: number, regular: number) => ({
        id, price: paid, price_incl_tax: paid, original_price: regular, original_price_incl_tax: regular
      });

      return {
        sku: 'BUNDLE-1',
        id: 77,
        name: 'Bundle',
        type_id: 'bundle',
        qty: 1,
        price: 80,
        price_incl_tax: 80,
        original_price: 100,
        original_price_incl_tax: 100,
        category,
        bundle_options: [{
          option_id: 1,
          required: true,
          product_links: [
            { id: '10', is_default: true, qty: 1, product: createChild(10, 80, 100) },
            { id: '11', is_default: false, qty: 1, product: createChild(11, 120, 140) }
          ]
        }],
        product_option: {
          extension_attributes: {
            bundle_options: { 1: { option_id: 1, option_qty: 1, option_selections: [selectedChildId] } }
          }
        }
      } as unknown as CartItem;
    }

    it('prices the selected bundle options instead of the default ones', async () => {
      expect(await addToCart(createBundle(11))).toMatchObject({
        ecommerce: { items: [{ item_id: 'BUNDLE-1', price: 120, discount: 20, quantity: 1 }] }
      });
    });

    it('prices the default selection with the default option amounts', async () => {
      expect(await addToCart(createBundle(10))).toMatchObject({
        ecommerce: { items: [{ price: 80, discount: 20 }] }
      });
    });
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
