import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import Checkout from '@vue-storefront/core/pages/Checkout';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { useStore } from '@vue-storefront/core/application-services';
import synchronizeActions from '@vue-storefront/core/modules/cart/store/actions/synchronizeActions';
import cartMutations from '@vue-storefront/core/modules/cart/store/mutations';
import { useEventAfterCartSettled } from 'theme/helpers/use-event-after-cart-settled';

jest.mock('@vue-storefront/core/application-services', () => ({ useStore: jest.fn() }));
jest.mock('@vue-storefront/core/app', () => ({ router: {} }));
jest.mock('@vue-storefront/i18n', () => ({ __esModule: true, default: { t: (s: string) => s } }));
jest.mock('config', () => ({ cart: {} }));
jest.mock('vue-offline/mixin', () => ({}));
jest.mock('@vue-storefront/core/mixins/composite', () => ({}));
jest.mock('@vue-storefront/core/lib/multistore', () => ({ currentStoreView: () => ({ i18n: { defaultCountry: 'US' } }), localizedRoute: (s: string) => s }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/request-services', () => ({ setServerRedirect: jest.fn() }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: () => () => {}, debug: () => () => {} } }));
jest.mock('@vue-storefront/core/modules/checkout', () => ({ CHECKOUT_UPDATE_SUCCESS_ORDER_DATA_MUTATION: 'checkout/success' }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));
jest.mock('@vue-storefront/core/data-resolver', () => ({ CartService: {} }));
jest.mock('@vue-storefront/core/modules/cart/helpers', () => ({ createDiffLog: jest.fn() }));
jest.mock('@vue-storefront/core/modules/cart/helpers/productsEquals', () => ({ __esModule: true, default: (a, b) => a.sku === b.sku }));

Vue.use(Vuex);
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

it('sends the edited quantity before checkout totals and waits through payment preparation', async () => {
  let releasePayment: () => void = () => undefined;
  const payment = new Promise<void>(resolve => { releasePayment = resolve; });
  const order: string[] = [];
  let serverQuantity = 1;
  const store = new Store<any>({ modules: {
    checkout: {
      namespaced: true,
      state: { entryPromise: null, entryRefreshAttempted: false, shippingDetails: {}, paymentDetails: {} },
      getters: { getSuccessOrderData: () => undefined },
      mutations: {
        setEntryPromise: (state, promise) => { state.entryPromise = promise; state.entryRefreshAttempted = false; },
        setEntryRefreshAttempted: state => { state.entryRefreshAttempted = true; }
      },
      actions: { setModifiedAt: () => {}, updatePropValue: () => {}, updatePaymentDetails: () => payment }
    },
    cart: {
      namespaced: true,
      state: { cartItems: [{ sku: 'one', qty: 2 }], platformTotals: { base_grand_total: 10 },
        cartServerLastTotalsSyncDate: 1, connectionPromises: [], syncPromise: null, isCartSyncing: false,
        isTotalsSyncing: false, isCouponProcessing: false, isAddingToCart: false },
      getters: {
        getCartItems: state => state.cartItems, getIsAdding: state => state.isAddingToCart,
        getLastTotalsSyncDate: state => state.cartServerLastTotalsSyncDate, canUpdateMethods: () => true,
        canSyncTotals: () => true, IS_CART_SYNCING: state => state.isCartSyncing,
        IS_TOTALS_SYNCING: state => state.isTotalsSyncing, IS_COUPON_PROCESSING: state => state.isCouponProcessing
      },
      mutations: { ...cartMutations, totals: state => { state.platformTotals = { base_grand_total: serverQuantity * 10 }; } },
      actions: {
        sync: synchronizeActions.sync, waitForStartup: () => Promise.resolve(), waitForIdle: () => Promise.resolve(),
        waitForConnections: () => Promise.resolve(), applyPendingCouponInCartTransaction: () => Promise.resolve(),
        performSync: ({ state }, options) => {
          expect(options).toMatchObject({ forceClientState: true, waitForTotalsUpdate: true });
          order.push('edit');
          serverQuantity = state.cartItems[0].qty;
          return {};
        },
        syncTotals: ({ commit }) => { order.push('totals'); commit('totals'); }
      }
    }
  } });
  jest.mocked(useStore).mockReturnValue(store);
  const vm: any = { $store: store, $router: { push: jest.fn() }, $forceUpdate: jest.fn(),
    successOrderData: undefined, activateSection: jest.fn(), localizedRoute: (s: string) => s,
    notifyEmptyCart: jest.fn(), notifyOutStock: jest.fn() };
  Object.keys(Checkout.methods).forEach(key => { vm[key] = Checkout.methods[key].bind(vm); });
  vm.activateSection = jest.fn();
  const events: any[] = [];
  const onCheckout = () => events.push({ qty: store.state.cart.cartItems[0].qty, value: store.state.cart.platformTotals.base_grand_total });
  EventBus.$on('beginCheckout', onCheckout);
  Checkout.beforeMount.call(vm);
  const page = new Vue({ setup () { useEventAfterCartSettled(true); }, render: h => h('div') }).$mount();
  await flush();
  expect(order).toEqual(['edit']);
  expect(events).toEqual([]);
  releasePayment();
  await store.state.checkout.entryPromise;
  await flush();
  expect(order).toEqual(['edit', 'totals']);
  expect(events).toEqual([{ qty: 2, value: 20 }]);
  page.$destroy();
  Checkout.beforeDestroy.call(vm);
  EventBus.$off('beginCheckout', onCheckout);
});
