import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import Checkout from '@vue-storefront/core/pages/Checkout';
import { CartService } from '@vue-storefront/core/data-resolver';
import { DiffLog } from '@vue-storefront/core/modules/cart/helpers/createDiffLog';
import synchronizeActions from '@vue-storefront/core/modules/cart/store/actions/synchronizeActions';
import mergeActions from '@vue-storefront/core/modules/cart/store/actions/mergeActions';
import couponActions from '@vue-storefront/core/modules/cart/store/actions/couponActions';
import totalsActions from '@vue-storefront/core/modules/cart/store/actions/totalsActions';
import cartGetters from '@vue-storefront/core/modules/cart/store/getters';
import cartMutations from '@vue-storefront/core/modules/cart/store/mutations';
import * as types from '@vue-storefront/core/modules/cart/store/mutation-types';
jest.mock('@vue-storefront/core/app', () => ({ router: {} }));
jest.mock('@vue-storefront/i18n', () => ({ __esModule: true, default: { t: (s: string) => s } }));
jest.mock('config', () => ({ cart: { synchronize: true, synchronize_totals: true } }));
jest.mock('vue-offline/mixin', () => ({}));
jest.mock('@vue-storefront/core/mixins/composite', () => ({}));
jest.mock('@vue-storefront/core/lib/multistore', () => ({ currentStoreView: () => ({ i18n: { defaultCountry: 'US' } }), localizedRoute: (s: string) => s }));
jest.mock('@vue-storefront/core/helpers', () => ({
  isServer: false,
  onlineHelper: { isOnline: true },
  calcItemsHmac: jest.requireActual('@vue-storefront/core/helpers/calc-items-hmac').calcItemsHmac
}));
jest.mock('@vue-storefront/core/request-services', () => ({ setServerRedirect: jest.fn() }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: () => () => {}, debug: () => () => {}, info: () => () => {} } }));
jest.mock('@vue-storefront/core/modules/checkout', () => ({ CHECKOUT_UPDATE_SUCCESS_ORDER_DATA_MUTATION: 'checkout/success' }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));
jest.mock('@vue-storefront/core/data-resolver', () => ({ CartService: { getItems: jest.fn(), applyCoupon: jest.fn(), getTotals: jest.fn() } }));
jest.mock('@vue-storefront/core/modules/cart/helpers', () => ({
  createDiffLog: () => new (jest.requireActual('@vue-storefront/core/modules/cart/helpers/createDiffLog').DiffLog)(),
  createOrderData: () => ({ country: 'US' }), createShippingInfoData: () => ({}), getAvailableShippingMethod: () => undefined,
  prepareShippingInfoForUpdateTotals: jest.requireActual('@vue-storefront/core/modules/cart/helpers/prepareShippingInfoForUpdateTotals').default
}));
jest.mock('@vue-storefront/core/modules/cart/helpers/productsEquals', () => ({ __esModule: true, default: (a, b) => a.sku === b.sku }));
jest.mock('@vue-storefront/core/modules/cart/helpers/productChecksum', () => ({ __esModule: true, default: () => 'checksum' }));
jest.mock('src/modules/shared', () => ({ CartEvents: jest.requireActual('src/modules/shared/types/cart-events').default }));

Vue.use(Vuex);
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function deferred () {
  let resolveDeferred!: () => void;
  let rejectDeferred!: (error: Error) => void;
  const promise = new Promise<void>((resolve, reject) => { resolveDeferred = resolve; rejectDeferred = reject; });
  return { promise, resolve: resolveDeferred, reject: rejectDeferred };
}

function mountCheckout ({ quantity, pendingCoupon, hasTotals, failRefresh, success }: {
  quantity?: number, pendingCoupon?: boolean, hasTotals?: boolean, failRefresh?: boolean, success?: string
} = {}) {
  const payment = deferred();
  const startup = deferred();
  const order: string[] = [];
  let serverQuantity = 1;
  const item = { sku: 'one', qty: 1, server_item_id: 7 };
  const push = jest.fn();
  jest.mocked(CartService.getItems).mockImplementation(async () => {
    order.push('read cart');
    return { resultCode: 200, result: [] } as any;
  });
  jest.mocked(CartService.applyCoupon).mockImplementation(async () => {
    order.push('apply coupon');
    return { resultCode: 200, result: true } as any;
  });
  jest.mocked(CartService.getTotals).mockImplementation(async () => {
    order.push('totals');
    if (failRefresh) throw new Error('totals unavailable');
    return { resultCode: 200, result: { base_grand_total: serverQuantity * 10, items: [{ item_id: 7, qty: serverQuantity }] } } as any;
  });
  const store = new Store<any>({ modules: {
    checkout: {
      namespaced: true,
      state: { shippingDetails: {}, paymentDetails: {} },
      getters: {
        getSuccessOrderData: () => undefined, getShippingDetails: state => state.shippingDetails,
        getPaymentDetails: state => state.paymentDetails, getShippingMethods: () => [], getPaymentMethods: () => []
      },
      actions: {
        setModifiedAt: () => {},
        updatePropValue: () => {},
        updatePaymentDetails: () => { order.push('payment details'); return payment.promise; }
      }
    },
    cart: {
      namespaced: true,
      state: {
        cartItems: quantity === 0 ? [] : [item], cartServerToken: 'quote', cartItemsHash: null,
        pendingCouponCode: pendingCoupon ? 'SAVE' : null, startupPromise: startup.promise,
        platformTotals: hasTotals ? { base_grand_total: 10 } : null,
        cartServerLastTotalsSyncDate: hasTotals ? 1 : 0, connectionPromises: [], syncPromise: null,
        isCartSyncing: false, totalsSyncDepth: 0, totalsRefreshId: 0,
        isTotalsSyncing: false, isCouponProcessing: false, isAddingToCart: false
      },
      getters: cartGetters,
      mutations: cartMutations,
      actions: {
        ...synchronizeActions, ...mergeActions, ...totalsActions, ...couponActions,
        mergeClientItems: ({ state }, options) => {
          expect(options.forceClientState).toBe(true);
          order.push('write quantity');
          serverQuantity = state.cartItems[0].qty;
          return new DiffLog();
        },
        mergeServerItems: () => new DiffLog(),
        updateItemsProductData: () => {},
        pullMethods: () => { order.push('methods'); }
      }
    }
  } });
  store.commit(`cart/${types.CART_SET_ITEMS_HASH}`, store.getters['cart/getCurrentCartHash']);
  if (quantity && quantity > 1) store.commit(`cart/${types.CART_UPD_ITEM}`, { product: item, qty: quantity });
  const page = new Vue({
    extends: Checkout,
    store,
    props: { success: { type: String, default: undefined } },
    propsData: { success },
    computed: { isSuccess () { return this.success === 'success'; } },
    beforeCreate () { Object.assign(this, { $router: { push }, $t: (text: string) => text }); },
    methods: { activateSection: jest.fn(), localizedRoute: (s: string) => s, notifyEmptyCart: jest.fn() },
    render: h => h('div')
  }).$mount() as Vue & { checkoutEntry: Promise<unknown>, success: string };
  const cleanup = () => page.$destroy();
  return { page, store, order, cleanup, payment, startup, push };
}

it.each([false, true])('starts payment without startup or idle waits when unchanged, flushes edits when pending (%s)', async pending => {
  const { page, store, payment, startup, order, cleanup } = mountCheckout({ quantity: pending ? 2 : 1, hasTotals: true, pendingCoupon: pending });
  const preparation = pending ? ['read cart', 'write quantity', 'apply coupon', 'payment details'] : ['payment details'];
  expect(page.checkoutEntry).toBeInstanceOf(Promise);
  await flush();
  expect(order).toEqual(preparation);
  payment.resolve();
  await page.checkoutEntry;
  expect(order).toEqual([...preparation, 'methods', 'totals']);
  expect(store.state.cart.platformTotals.base_grand_total).toBe(pending ? 20 : 10);
  startup.resolve();
  cleanup();
});

it.each(['left', 'success'])('does not report a visit after checkout is %s', async ended => {
  const { page, payment, startup, order, cleanup } = mountCheckout();
  await flush();
  if (ended === 'left') page.$destroy();
  else page.success = 'success';
  payment.resolve();
  startup.resolve();
  await flush();
  expect(order).toEqual(['payment details']);
  cleanup();
});

it.each([false, true])('skips payment and methods for an ineligible entry (success route: %s)', async success => {
  const { startup, order, cleanup, push } = mountCheckout(success ? { success: 'success' } : { quantity: 0 });
  startup.resolve();
  await flush();
  expect(push).toHaveBeenCalledTimes(success ? 0 : 1);
  expect(order).toEqual([]);
  cleanup();
});

it.each(['payment details', 'totals'])('does not retry when %s fails', async stage => {
  const { payment, startup, order, cleanup } = mountCheckout({ failRefresh: stage === 'totals' });
  await flush();
  if (stage === 'totals') payment.resolve();
  else payment.reject(new Error('payment unavailable'));
  startup.resolve();
  await flush();
  expect(order).toEqual(stage === 'totals' ? ['payment details', 'methods', 'totals'] : ['payment details']);
  cleanup();
});

it('requires complete, successfully applied totals for the current payment quote, including zero totals', () => {
  const { store, cleanup } = mountCheckout({ quantity: 0 });
  const totals = {
    base_grand_total: 0, base_tax_amount: 0, base_shipping_amount: 0, base_subtotal: 10,
    base_discount_amount: -10, quote_currency_code: 'USD'
  };
  const applyTotals = (platformTotals: object) => {
    store.commit(`cart/${types.CART_UPD_TOTALS}`, { platformTotals });
    store.commit(`cart/${types.CART_SET_TOTALS_SYNC}`);
  };
  applyTotals({ ...totals, base_shipping_amount: null });
  expect(store.getters['cart/getPaymentTotals']).toBeNull();
  applyTotals(totals);
  expect(store.getters['cart/getPaymentTotals']).toEqual(totals);
  store.commit(`cart/${types.CART_LOAD_CART_SERVER_TOKEN}`, 'replacement');
  expect(store.getters['cart/getPaymentTotals']).toBeNull();
  cleanup();
});
