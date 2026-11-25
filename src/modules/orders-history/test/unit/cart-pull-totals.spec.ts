import Vue from 'vue';
import Vuex from 'vuex';
import { CartService } from '@vue-storefront/core/data-resolver';
import { TaskQueue } from '@vue-storefront/core/lib/sync';
import connectActions from '@vue-storefront/core/modules/cart/store/actions/connectActions';
import mergeActions from '@vue-storefront/core/modules/cart/store/actions/mergeActions';
import synchronizeActions from '@vue-storefront/core/modules/cart/store/actions/synchronizeActions';
import totalsActions from '@vue-storefront/core/modules/cart/store/actions/totalsActions';
import cartGetters from '@vue-storefront/core/modules/cart/store/getters';
import cartMutations from '@vue-storefront/core/modules/cart/store/mutations';
import * as types from '@vue-storefront/core/modules/cart/store/mutation-types';
import { actions as ordersHistoryActions } from '../../store/actions';
import ordersHistoryMutations from '../../store/mutations';
import { REORDER_ITEM } from '../../types/store/actions';

jest.mock('config', () => ({ budsies: { endpoint: '/test' }, cart: { synchronize: true, synchronize_totals: true, serverMergeByDefault: true } }));
jest.mock('@vue-storefront/i18n', () => ({ __esModule: true, default: { t: (text: string) => text } }));
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: { info: () => () => {}, debug: () => () => {}, error: () => () => {} }
}));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({}));
jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: { execute: jest.fn() } }));
jest.mock('@vue-storefront/core/data-resolver', () => ({
  CartService: { getTotals: jest.fn(), getItems: jest.fn(), getCartToken: jest.fn(), mergeGuestAndCustomer: jest.fn() }
}));
jest.mock('@vue-storefront/core/modules/cart/helpers', () => ({
  createDiffLog: () => new (jest.requireActual('@vue-storefront/core/modules/cart/helpers/createDiffLog').DiffLog)(),
  createOrderData: () => ({ country: 'US' }), createShippingInfoData: () => ({}), getAvailableShippingMethod: () => undefined,
  prepareShippingInfoForUpdateTotals: jest.requireActual('@vue-storefront/core/modules/cart/helpers/prepareShippingInfoForUpdateTotals').default
}));
jest.mock('@vue-storefront/core/modules/cart/helpers/productsEquals', () => ({ __esModule: true, default: (a, b) => a.sku === b.sku }));
jest.mock('@vue-storefront/core/helpers', () => ({
  isServer: false, onlineHelper: { isOnline: true }, processURLAddress: (url: string) => url,
  calcItemsHmac: (items, quote) => JSON.stringify([quote, items.map(({ sku, qty }) => [sku, qty])])
}));
jest.mock('src/modules/shared', () => ({}));
jest.mock('src/modules/customization-system', () => ({}));
jest.mock('storefront-query-builder', () => ({}));

Vue.use(Vuex);

it.each(['guest merge', 'empty-cache login', 'reorder'])('applies one methods/totals chain after %s', async flow => {
  jest.clearAllMocks();
  const pullMethods = jest.fn();
  const store = new Vuex.Store({ modules: {
    user: { namespaced: true, getters: { getUserToken: () => 'test-user', getToken: () => 'test-user' } },
    checkout: { namespaced: true, getters: { getShippingDetails: () => ({}), getShippingMethods: () => [] } },
    orders: { namespaced: true, state: { isReorderingItem: false }, actions: ordersHistoryActions, mutations: ordersHistoryMutations },
    cart: {
      namespaced: true,
      state: {
        cartItems: flow === 'empty-cache login' ? [] : [{ sku: 'old', qty: 1 }],
        cartServerToken: flow === 'empty-cache login' ? null : 'old-quote', cartItemsHash: null,
        cartServerLastTotalsSyncDate: 1, platformTotals: { base_grand_total: 20 },
        syncPromise: null, connectionPromises: [], totalsSyncDepth: 0, totalsRefreshId: 0
      },
      getters: cartGetters, mutations: cartMutations,
      actions: {
        ...connectActions, ...synchronizeActions, ...mergeActions, ...totalsActions,
        getProductVariant: (_, { serverItem }) => ({ sku: serverItem.sku, qty: serverItem.qty, server_item_id: serverItem.item_id }),
        addItem: ({ commit }, { productToAdd }) => commit(types.CART_ADD_ITEM, { product: productToAdd }),
        updateItemsProductData: () => {}, applyPendingCouponInCartTransaction: () => {}, pullMethods
      }
    }
  } });
  const totals = { base_grand_total: 70, coupon_code: 'SAVE', items: [{ item_id: 7, qty: 2 }] };
  jest.mocked(TaskQueue.execute).mockResolvedValue({ resultCode: 200 } as any);
  jest.mocked(CartService.mergeGuestAndCustomer).mockResolvedValue({ resultCode: 200, result: 'current-quote' } as any);
  jest.mocked(CartService.getCartToken).mockResolvedValue({ resultCode: 200, result: 'current-quote' } as any);
  jest.mocked(CartService.getItems).mockResolvedValue({ resultCode: 200, result: [{ sku: 'restored', item_id: 7, qty: 2 }] } as any);
  jest.mocked(CartService.getTotals).mockResolvedValue({ resultCode: 200, result: totals } as any);

  if (flow === 'reorder') await store.dispatch(`orders/${REORDER_ITEM}`, { orderItemId: 7 });
  else await store.dispatch('cart/mergeGuestAndCustomer');

  expect(CartService.getItems).toHaveBeenCalledTimes(1);
  expect(pullMethods).toHaveBeenCalledTimes(1);
  expect(CartService.getTotals).toHaveBeenCalledTimes(1);
  expect(store.getters['cart/getCartItems']).toMatchObject([{ sku: 'restored', qty: 2 }]);
  expect(store.getters['cart/getCoupon']).toMatchObject({ code: 'SAVE' });
});
