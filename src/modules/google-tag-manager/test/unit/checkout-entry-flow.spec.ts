import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import Checkout from 'theme/pages/Checkout.vue';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { CartService } from '@vue-storefront/core/data-resolver';
import { DiffLog } from '@vue-storefront/core/modules/cart/helpers/createDiffLog';
import synchronizeActions from '@vue-storefront/core/modules/cart/store/actions/synchronizeActions';
import mergeActions from '@vue-storefront/core/modules/cart/store/actions/mergeActions';
import couponActions from '@vue-storefront/core/modules/cart/store/actions/couponActions';
import totalsActions from '@vue-storefront/core/modules/cart/store/actions/totalsActions';
import cartGetters from '@vue-storefront/core/modules/cart/store/getters';
import cartMutations from '@vue-storefront/core/modules/cart/store/mutations';
import * as types from '@vue-storefront/core/modules/cart/store/mutation-types';
import CartEvents from 'src/modules/shared/types/cart-events';

jest.mock('@storefront-ui/vue', () => ({ SfSteps: {} }));
jest.mock('src/modules/payment-braintree', () => ({ Braintree: {} }));
jest.mock('@vue-storefront/core/lib/modules', () => ({ registerModule: jest.fn() }));
jest.mock('theme/components/organisms/o-billing-address', () => ({}));
jest.mock('theme/components/organisms/o-shipping', () => ({}));
jest.mock('theme/components/organisms/o-confirm-order', () => ({}));
jest.mock('theme/components/organisms/o-order-review', () => ({}));
jest.mock('theme/components/organisms/o-order-summary', () => ({}));
jest.mock('theme/components/organisms/o-order-success', () => ({}));
jest.mock('theme/components/organisms/o-personal-details', () => ({}));
jest.mock('theme/components/organisms/o-cart-items-table', () => ({}));
jest.mock('src/modules/promotion-platform/components/ProductionSpotCountdown.vue', () => ({}));
jest.mock('theme/store/ui/modals', () => ({}));
jest.mock('@vue-storefront/core/filters', () => ({}));
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
  const events: object[] = [];
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
  const onCheckout = () => events.push({ qty: item.qty, value: store.state.cart.platformTotals?.base_grand_total });
  EventBus.$on(CartEvents.BEGIN_CHECKOUT, onCheckout);
  const page = new Vue({
    extends: Checkout,
    store,
    propsData: { success },
    beforeCreate () { Object.assign(this, { $router: { push }, $t: (text: string) => text }); },
    methods: { activateSection: jest.fn(), localizedRoute: (s: string) => s, notifyEmptyCart: jest.fn() },
    render: h => h('div')
  }).$mount() as Vue & { checkoutEntry: Promise<unknown>, success: string };
  const cleanup = () => { page.$destroy(); EventBus.$off(CartEvents.BEGIN_CHECKOUT, onCheckout); };
  return { page, store, order, events, cleanup, payment, startup, push };
}

it.each([false, true])('starts payment without startup or idle waits when unchanged, flushes edits when pending (%s)', async pending => {
  const { page, payment, startup, order, events, cleanup } = mountCheckout({ quantity: pending ? 2 : 1, hasTotals: true, pendingCoupon: pending });
  const preparation = pending ? ['read cart', 'write quantity', 'apply coupon', 'payment details'] : ['payment details'];
  expect(page.checkoutEntry).toBeInstanceOf(Promise);
  await flush();
  expect(order).toEqual(preparation);
  expect(events).toEqual([]);
  payment.resolve();
  await page.checkoutEntry;
  expect(order).toEqual([...preparation, 'methods', 'totals']);
  expect(events).toEqual([]);
  startup.resolve();
  await flush();
  expect(events).toEqual([{ qty: pending ? 2 : 1, value: pending ? 20 : 10 }]);
  cleanup();
});

it.each(['left', 'success'])('does not report a visit after checkout is %s', async ended => {
  const { page, payment, startup, order, events, cleanup } = mountCheckout();
  await flush();
  if (ended === 'left') page.$destroy();
  else page.success = 'success';
  payment.resolve();
  startup.resolve();
  await flush();
  expect(order).toEqual(['payment details']);
  expect(events).toEqual([]);
  cleanup();
});

it.each([false, true])('skips payment, methods and analytics for an ineligible entry (success route: %s)', async success => {
  const { startup, order, events, cleanup, push } = mountCheckout(success ? { success: 'success' } : { quantity: 0 });
  startup.resolve();
  await flush();
  expect(push).toHaveBeenCalledTimes(success ? 0 : 1);
  expect(order).toEqual([]);
  expect(events).toEqual([]);
  cleanup();
});

it.each(['payment details', 'totals'])('allows a read-only fallback only when entry fails before totals (%s)', async stage => {
  const { payment, startup, order, events, cleanup } = mountCheckout({ failRefresh: stage === 'totals' });
  await flush();
  if (stage === 'totals') payment.resolve();
  else payment.reject(new Error('payment unavailable'));
  startup.resolve();
  await flush();
  expect(order).toEqual(stage === 'totals' ? ['payment details', 'methods', 'totals'] : ['payment details', 'totals']);
  expect(events).toEqual([{ qty: 1, value: stage === 'totals' ? undefined : 10 }]);
  cleanup();
});
