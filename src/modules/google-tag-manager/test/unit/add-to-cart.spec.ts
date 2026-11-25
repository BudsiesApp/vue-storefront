import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import VueGtm from '@gtm-support/vue2-gtm';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { CartService } from '@vue-storefront/core/data-resolver';
import { DiffLog } from '@vue-storefront/core/modules/cart/helpers/createDiffLog';
import itemActions from '@vue-storefront/core/modules/cart/store/actions/itemActions';
import synchronizeActions from '@vue-storefront/core/modules/cart/store/actions/synchronizeActions';
import mergeActions from '@vue-storefront/core/modules/cart/store/actions/mergeActions';
import totalsActions from '@vue-storefront/core/modules/cart/store/actions/totalsActions';
import * as cartMutationTypes from '@vue-storefront/core/modules/cart/store/mutation-types';
import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import ServerError from 'src/modules/shared/types/server-error';
import fillProductWithAdditionalFields from 'src/modules/budsies/helpers/fill-product-with-additional-fields.function';

import EventBusListener from '../../helpers/EventBusListener';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('config', () => ({ stock: { allowOutOfStockInCart: true }, cart: { serverMergeByDefault: true } }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true,
  default: { $on: jest.fn(), $emit: jest.fn() }
}));
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: { error: jest.fn(() => jest.fn()), info: jest.fn(() => jest.fn()), debug: jest.fn(() => jest.fn()), warn: jest.fn(() => jest.fn()) }
}));
jest.mock('@vue-storefront/core/lib/multistore', () => ({
  currentStoreView: () => ({ name: 'Petsies', tax: { defaultCountry: 'US' } }),
  localizedRoute: jest.fn()
}));
jest.mock('@vue-storefront/core/app', () => ({ router: { push: jest.fn() } }));
jest.mock('@vue-storefront/core/data-resolver', () => ({ CartService: { getItems: jest.fn(), updateItem: jest.fn(), getTotals: jest.fn() } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));
jest.mock('@vue-storefront/i18n', () => ({ __esModule: true, default: { t: (text: string) => text } }));
// The diff log, notifications and validation are the real ones, so `addItems` decides what was accepted.
jest.mock('@vue-storefront/core/modules/cart/helpers', () => ({
  prepareProductsToAdd: (product: Record<string, any>) => [{ ...product, category: undefined, category_ids: undefined }],
  productsEquals: (left: { sku: string }, right: { sku: string }) => left.sku === right.sku,
  validateProduct: jest.requireActual('@vue-storefront/core/modules/cart/helpers/validateProduct').default,
  createDiffLog: () => new (jest.requireActual('@vue-storefront/core/modules/cart/helpers/createDiffLog').DiffLog)(),
  notifications: jest.requireActual('@vue-storefront/core/modules/cart/helpers/notifications'),
  createOrderData: () => ({ country: 'US' }), createShippingInfoData: () => ({}),
  getAvailableShippingMethod: jest.fn(), prepareShippingInfoForUpdateTotals: () => ({}),
  createCartItemForUpdate: (item: CartItem) => ({ sku: item.sku, qty: item.qty }), preparePaymentMethodsToSync: jest.fn()
}));
jest.mock('@vue-storefront/core/modules/cart/helpers/productChecksum', () => ({ __esModule: true, default: () => 'checksum' }));
// The real rule that shows an error for a failed server response, so the tests see what the shopper sees.
jest.mock('@vue-storefront/core/i18n', () => ({ __esModule: true, default: { t: (text: string) => text } }));
jest.mock('@vue-storefront/core/modules/cart', () => ({ GET_CART_ITEM_PRICE: 'cart/getCartItemPrice' }));
jest.mock('@vue-storefront/core/modules/catalog', () => ({ GET_PRODUCT_PRICE: 'product/getProductPrice' }));
jest.mock('@vue-storefront/core/modules/catalog/helpers', () => ({
  isBundleProduct: (product: { type_id: string }) => product.type_id === 'bundle'
}));
jest.mock('@vue-storefront/core/filters', () => ({ price: jest.fn() }));
jest.mock('@vue-storefront/core/modules/checkout', () => ({ ORDER_ERROR_EVENT: 'order-error' }));
jest.mock('src/modules/shared', () => ({
  PriceHelper: jest.requireActual('@vue-storefront/core/helpers/price'),
  getProductOptions: () => ({}),
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
  // The error that `addItem` threw for the last add, which the shopper sees.
  let addError: unknown;

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

  interface AddToCartOptions {
    // Responses of the server to the items of the add, as reported by the cart merge.
    serverResponses?: Record<string, any>[],
    stockStatus?: string,
    // Result code of the cart read at the start of the synchronization.
    cartReadCode?: number | null
    rejectAt?: 'checkProductStatus' | 'create' | 'sync'
    writeTotals?: ItemTotals
    pullMethods?: () => Promise<void>
  }

  // Runs the real `addItem`, `addItems`, `sync` and `performSync` actions; only the stock check, the cart
  // mutation, the cart read, the merge of the server items and the clearing of the cart are replaced.
  async function addToCart (product: CartItem, itemTotals?: ItemTotals, options: AddToCartOptions = {}) {
    const { serverResponses = [], stockStatus = 'ok', cartReadCode = 200, rejectAt, writeTotals, pullMethods } = options;
    const getters = {
      get isCartConnected () { return Boolean(this.getCartToken); },
      isCartSyncEnabled: true,
      canUpdateMethods: true,
      isSyncRequired: true,
      getCartItems: store.state.cart.cartItems,
      getPendingCouponCode: null,
      canSyncTotals: true, isTotalsSyncRequired: true, getCartToken: 'quote', getCurrentCartHash: 'hash',
      isCartHashChanged: false
    };
    const syncState = { syncPromise: null, isAdding: false };
    const commit = (type: string, payload: any = {}) => {
      const { product: addedProduct, isAdding } = payload;
      if (type === cartMutationTypes.CART_LOAD_CART_SERVER_TOKEN) getters.getCartToken = payload;
      if (type === cartMutationTypes.CART_ADDING_ITEM) syncState.isAdding = Boolean(isAdding);
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
    };
    const context: any = {
      getters,
      commit,
      state: syncState,
      rootGetters: { 'checkout/getShippingDetails': {}, 'checkout/getShippingMethods': [],
        'checkout/getPaymentMethods': [], 'checkout/getPaymentDetails': {} },
      dispatch: jest.fn(async (name: string, payload: Record<string, any>) => {
        if (name === rejectAt) throw new Error(`Rejected ${name}`);
        switch (name) {
          case 'addItems':
            return (itemActions as any).addItems(context, payload);
          case 'checkProductStatus':
            return { status: stockStatus, onlineCheckTaskId: 1 };
          case 'sync':
            return (synchronizeActions as any).sync(context, payload);
          case 'performSync':
            return (synchronizeActions as any).performSync(context, payload);
          case 'clear':
            store.state.cart.cartItems = [];
            getters.getCartToken = '';
            getters.canSyncTotals = false;
            getters.canUpdateMethods = false;

            return undefined;
          case 'merge': {
            if (pullMethods) return (mergeActions as any).merge(context, payload);
            const diffLog = new DiffLog();

            serverResponses.forEach((response) => diffLog.pushServerResponse(response as any));

            return diffLog;
          }
          case 'mergeClientItems':
          case 'mergeClientItem':
          case 'synchronizeServerItem':
          case 'updateServerItem':
          case 'processUpdateServerItemResponse':
          case 'updateClientItem':
            return (mergeActions as any)[name](context, payload);
          case 'mergeServerItems':
            return new DiffLog();
          case 'updateItemsProductData':
            return undefined;
          case 'pullMethods':
            return pullMethods?.();
          case 'updateItem':
            Object.assign(store.state.cart.cartItems[0], payload.product);
            return;
          case 'updateTotalsAfterMerge':
            return (mergeActions as any).updateTotalsAfterMerge(context, payload);
          case 'syncTotals':
          case 'overrideServerTotals':
          case 'getTotals':
            return (totalsActions as any)[name](context, payload);
          default:
            return undefined;
        }
      })
    };

    jest.mocked(CartService.getItems).mockResolvedValue({ resultCode: cartReadCode ?? undefined, result: [] } as any);
    jest.mocked(CartService.updateItem).mockReset().mockResolvedValue({ resultCode: 200, result: {
      item_id: 7, sku: product.sku, extension_attributes: { budsies_quote_item_totals: writeTotals }
    } } as any);
    jest.mocked(CartService.getTotals).mockReset().mockResolvedValue({ resultCode: 200, result: { items: [] } } as any);

    pushes.length = 0;
    addError = undefined;

    try {
      await (itemActions as any).addItem(context, { productToAdd: product });
    } catch (error) {
      addError = error;
    }

    expect(syncState.isAdding).toBe(false);

    return pushes.find(({ event }) => event === 'add_to_cart');
  }

  beforeEach(() => {
    store.state.cart.cartItems = [];
    jest.mocked(EventBus.$emit).mockImplementation((event, payload) => {
      if (event === 'cart-prepare-item-product') fillProductWithAdditionalFields(payload);
      return EventBus;
    });
  });

  it('reports an undiscounted product added with quantity two', async () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };

    expect(await addToCart(createProduct(2), itemTotals)).toMatchObject({
      ecommerce: { value: 999, items: [{ item_id: 'PLUSH-1', price: 100, discount: 0, quantity: 2 }] }
    });
  });

  it('resolves an accepted quantity increase with the write price while the methods/totals chain is pending', async () => {
    const previousTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };
    const writeTotals = { ...previousTotals, discount_amount: -25, final_price: 75 };
    await addToCart(createProduct(3), previousTotals);
    let finishMethods!: () => void;
    const methods = new Promise<void>(resolve => { finishMethods = resolve; });
    const pullMethods = jest.fn(() => methods);
    try {
      const event = await addToCart(createProduct(2), undefined, { writeTotals, pullMethods });
      expect(addError).toBeUndefined();
      expect(CartService.updateItem).toHaveBeenCalledTimes(1);
      expect(pullMethods).toHaveBeenCalledTimes(1);
      expect(CartService.getTotals).not.toHaveBeenCalled();
      expect(event).toMatchObject({ ecommerce: { value: 999, items: [{ quantity: 2, price: 75, discount: 25 }] } });
      expect(store.state.cart.cartItems[0].qty).toBe(5);
    } finally {
      finishMethods();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(CartService.getTotals).toHaveBeenCalledTimes(1);
  });

  it.each(['checkProductStatus', 'create', 'sync'] as const)('releases Add when %s rejects', async rejectAt => {
    expect(await addToCart(createProduct(1), undefined, { rejectAt })).toBeUndefined();
    expect(addError).toMatchObject({ message: `Rejected ${rejectAt}` });
  });

  it('falls back to net product prices when the line has no item totals', async () => {
    expect(await addToCart(createProduct(1))).toMatchObject({
      ecommerce: { items: [{ price: 80, discount: 20, quantity: 1 }] }
    });
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
    const rejected = [{ status: 500, sku: 'PLUSH-1', result: { resultCode: 500, result: 'Provided email is not valid' } }];

    expect(await addToCart(createProduct(1), itemTotals, { serverResponses: rejected })).toBeUndefined();
    expect(addError).toMatchObject({ message: 'Provided email is not valid' });
  });

  it.each(['stock', 'validation'])('does not report a local %s rejection', async reason => {
    const product = createProduct(1);
    if (reason === 'validation') product.price_incl_tax = 0;
    expect(await addToCart(product, undefined, { stockStatus: reason === 'stock' ? 'out_of_stock' : 'ok' })).toBeUndefined();
    expect(store.state.cart.cartItems).toHaveLength(0);
  });

  describe('when the cart synchronization fails', () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };

    // The items are not rejected: they stay in the cart and a later synchronization sends them, so no error
    // is shown and a retry of the shopper is not triggered.
    it.each([500, 503, null])('keeps the item and shows no error when the cart read fails with %s', async (cartReadCode) => {
      expect(await addToCart(createProduct(1), itemTotals, { cartReadCode })).toMatchObject({ event: 'add_to_cart' });
      expect(addError).toBeUndefined();
      expect(store.state.cart.cartItems).toHaveLength(1);
      expect(store.state.cart.cartItems[0].qty).toBe(1);
    });

    it('reports the cart-read 404 clearly, and adds once when the shopper retries', async () => {
      await addToCart(createProduct(3), itemTotals);
      expect(await addToCart(createProduct(1), itemTotals, { cartReadCode: 404 })).toBeUndefined();
      expect(addError).toBeInstanceOf(ServerError);
      expect(addError).toMatchObject({ message: 'Your cart is no longer available. Please add your items again.' });
      expect(store.state.cart.cartItems).toHaveLength(0);
      expect(await addToCart(createProduct(1), itemTotals)).toMatchObject({ ecommerce: { items: [{ quantity: 1 }] } });
      expect(store.state.cart.cartItems[0].qty).toBe(1);
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

    it.each([[10, 80], [11, 120]])('prices the bundle option %s actually selected', async (option, price) => {
      expect(await addToCart(createBundle(option))).toMatchObject({
        ecommerce: { items: [{ item_id: 'BUNDLE-1', price, discount: 20, quantity: 1 }] }
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
