import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import VueGtm from '@gtm-support/vue2-gtm';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { CartService } from '@vue-storefront/core/data-resolver';
import { DiffLog } from '@vue-storefront/core/modules/cart/helpers/createDiffLog';
import { cartHooks } from '@vue-storefront/core/modules/cart/hooks';
import itemActions from '@vue-storefront/core/modules/cart/store/actions/itemActions';
import synchronizeActions from '@vue-storefront/core/modules/cart/store/actions/synchronizeActions';
import mergeActions from '@vue-storefront/core/modules/cart/store/actions/mergeActions';
import productActions from '@vue-storefront/core/modules/cart/store/actions/productActions';
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
      product: { productDiscountedPrice: {}, productBySku: {} },
      user: { current: null }
    },
    getters: {
      'cart/getCartItems': (state) => state.cart.cartItems,
      'cart/getCartItemPrice': () => cartItemPriceGetter,
      'product/getProductBySkuDictionary': state => state.product.productBySku
    }
  });
  const category = [{ category_id: 4, name: 'Plushies', slug: 'plushies-4', path: 'plushies/plushies-4' }];
  // The error that `addItem` threw for the last add, which the shopper sees.
  let addError: unknown;

  new EventBusListener(store, gtm).initEventBusListeners();
  const afterAddToCart = jest.fn();
  cartHooks.afterAddToCart(afterAddToCart);

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

  interface CartActionOptions {
    // Responses of the server to the items of the add, as reported by the cart merge.
    serverResponses?: Record<string, any>[],
    stockStatus?: string,
    // Result code of the cart read at the start of the synchronization.
    cartReadCode?: number | null
    serverItems?: (CartItem & { item_id: number, quote_id: string })[]
    rejectAt?: 'checkProductStatus' | 'create' | 'sync'
    writeTotals?: ItemTotals
    pullMethods?: () => Promise<void>
  }

  // Run the real Add and server-import actions against stubbed APIs, catalog lookup and cart mutations.
  function setupCartActions (product: CartItem, itemTotals?: ItemTotals, options: CartActionOptions = {}) {
    const { serverResponses = [], stockStatus = 'ok', cartReadCode = 200, serverItems = [], rejectAt, writeTotals, pullMethods } = options;
    const getters = {
      get isCartConnected () { return Boolean(this.getCartToken); },
      isCartSyncEnabled: true,
      canUpdateMethods: true,
      isSyncRequired: true,
      get getCartItems () { return store.state.cart.cartItems; },
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
        server_item_id: addedProduct.server_item_id ?? 7,
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
          case 'addItem':
          case 'addItems':
            return (itemActions as any)[name](context, payload);
          case 'checkProductStatus':
            return { status: stockStatus, onlineCheckTaskId: 1 };
          case 'sync':
          case 'performSync':
            return (synchronizeActions as any)[name](context, payload);
          case 'clear':
            store.state.cart.cartItems = [];
            if (payload.disconnect) {
              getters.getCartToken = '';
              getters.canSyncTotals = false;
              getters.canUpdateMethods = false;
            }

            return undefined;
          case 'merge': {
            if (!serverResponses.length) return (mergeActions as any).merge(context, payload);
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
          case 'mergeServerItems':
          case 'mergeServerItem':
            return (mergeActions as any)[name](context, payload);
          case 'getProductVariant':
          case 'findProductOption':
            return productActions[name](context, payload);
          case 'product/single':
            return serverItems.find(({ sku }) => sku === payload.options.sku);
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

    jest.mocked(CartService.getItems).mockReset().mockResolvedValue({ resultCode: cartReadCode ?? undefined, result: serverItems } as any);
    jest.mocked(CartService.updateItem).mockReset().mockResolvedValue({ resultCode: 200, result: {
      item_id: 7, sku: product.sku,
      ...(writeTotals ? { extension_attributes: { budsies_quote_item_totals: writeTotals } } : {})
    } } as any);
    jest.mocked(CartService.getTotals).mockReset().mockResolvedValue({ resultCode: 200, result: { items: [] } } as any);

    pushes.length = 0;

    return context;
  }

  async function addToCart (product: CartItem, itemTotals?: ItemTotals, options: CartActionOptions = {}) {
    const context = setupCartActions(product, itemTotals, options);
    addError = undefined;

    try {
      await (itemActions as any).addItem(context, { productToAdd: product });
    } catch (error) {
      addError = error;
    }

    expect(context.state.isAdding).toBe(false);

    return pushes.find(({ event }) => event === 'add_to_cart');
  }

  beforeEach(() => {
    store.state.cart.cartItems = [];
    store.state.product.productBySku = {};
    afterAddToCart.mockClear();
    cartItemPriceGetter.mockClear();
    jest.mocked(EventBus.$emit).mockImplementation((event, payload) => {
      if (event === 'cart-prepare-item-product') fillProductWithAdditionalFields(payload);
      return EventBus;
    });
  });

  function serverCartWithTwoLines () {
    return [
      { ...createProduct(2), item_id: 7, quote_id: 'quote' },
      { ...createProduct(3), sku: 'PLUSH-2', item_id: 8, quote_id: 'quote' }
    ];
  }

  it('restores server lines during sync without reporting shopper Adds', async () => {
    const serverItems = serverCartWithTwoLines();
    const context = setupCartActions(serverItems[0], undefined, { serverItems });

    await synchronizeActions.sync(context, {});

    expect(store.state.cart.cartItems).toMatchObject([{ sku: 'PLUSH-1', qty: 2 }, { sku: 'PLUSH-2', qty: 3 }]);
    expect(afterAddToCart).toHaveBeenCalledTimes(2);
    expect(cartItemPriceGetter).not.toHaveBeenCalled();
    expect(pushes).toHaveLength(0);
    expect(CartService.getItems).toHaveBeenCalledTimes(1);
    expect(CartService.updateItem).not.toHaveBeenCalled();
  });

  it('does not report Adds when the Re-order pull reloads the whole cart', async () => {
    // Order History calls pullServerCart(true) after Magento has added the reordered unit.
    const serverItems = serverCartWithTwoLines();
    store.state.cart.cartItems = serverItems.map(item => ({ ...item, server_item_id: item.item_id }));
    store.state.cart.cartItems[0].qty = 1;
    const context = setupCartActions(serverItems[0], undefined, { serverItems });

    await synchronizeActions.pullServerCart(context, true);

    expect(store.state.cart.cartItems).toMatchObject([{ sku: 'PLUSH-1', qty: 2 }, { sku: 'PLUSH-2', qty: 3 }]);
    expect(afterAddToCart).toHaveBeenCalledTimes(2);
    expect(pushes).toHaveLength(0);
    expect(CartService.getItems).toHaveBeenCalledTimes(1);
    expect(CartService.updateItem).not.toHaveBeenCalled();
  });

  it.each([false, true])('uses the hydrated cart name on Add without waiting for catalog hydration (cached child: %s)', async cached => {
    const variantName = 'Custom Bling Collar | Jazzy Blue';
    const variant = { sku: 'customcollar_jazzy_blue', name: variantName };
    const product = {
      ...createProduct(1), sku: variant.sku, name: 'Custom Bling Collar',
      configurable_children: cached ? undefined : [{ sku: 'another-collar', name: 'Another color' }, variant]
    };
    if (cached) store.state.product.productBySku = { [variant.sku]: variant };

    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 75 };
    const event = await addToCart(product, undefined, { writeTotals: itemTotals });
    expect(store.state.cart.cartItems[0].name).toBe('Custom Bling Collar');
    expect(event).toMatchObject({ ecommerce: { items: [{ item_name: variantName, price: 75, quantity: 1 }] } });

    // A retained item without fresh amounts still uses the same name, not the parent's name.
    expect(await addToCart(product, undefined, { cartReadCode: 503 })).toMatchObject({
      ecommerce: { items: [{ item_name: variantName, price: 80, quantity: 1 }] }
    });
  });

  it('reports an undiscounted product added with quantity two', async () => {
    const itemTotals = { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 };

    expect(await addToCart(createProduct(2), undefined, { writeTotals: itemTotals })).toMatchObject({
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

  it.each([200, 503])('does not reuse an existing line DTO without fresh write amounts (cart read %s)', async cartReadCode => {
    const oldTotals = { regular_price: 100, savings_amount: 0, discount_amount: -50, final_price: 50 };
    store.state.cart.cartItems.push({
      ...createProduct(3), server_item_id: 7,
      extension_attributes: { budsies_quote_item_totals: oldTotals }
    });
    expect(await addToCart(createProduct(2), undefined, { cartReadCode })).toMatchObject({
      ecommerce: { value: 999, items: [{ price: 80, discount: 20, quantity: 2 }] }
    });
    expect(addError).toBeUndefined();
    expect(CartService.updateItem).toHaveBeenCalledTimes(cartReadCode === 200 ? 1 : 0);
    expect(store.state.cart.cartItems[0].extension_attributes.budsies_quote_item_totals).toEqual(oldTotals);
    expect(store.state.cart.cartItems[0].qty).toBe(5);
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
