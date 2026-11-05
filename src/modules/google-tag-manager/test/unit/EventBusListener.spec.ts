import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import VueGtm from '@gtm-support/vue2-gtm';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { cartHooks } from '@vue-storefront/core/modules/cart/hooks';
import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem';

import EventBusListener from '../../helpers/EventBusListener';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true,
  default: { $on: jest.fn() }
}));
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: { error: jest.fn(() => jest.fn()) }
}));
jest.mock('@vue-storefront/core/lib/multistore', () => ({
  currentStoreView: () => ({ name: 'Petsies' })
}));
jest.mock('@vue-storefront/core/modules/cart/hooks', () => ({
  cartHooks: { afterAddToCart: jest.fn(), afterRemoveFromCart: jest.fn() }
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
  ProductEvent: { PRODUCT_CARD_CLICK: 'product-card-click', PRODUCT_LIST_SHOW: 'product-list-show', PRODUCT_PAGE_SHOW: 'product-page-show' },
  UserEvents: { CUSTOMER_DATA_CHANGED: 'customer-data-changed' }
}));
jest.mock('src/modules/budsies', () => ({ PlushieWizardEvents: {} }));
jest.mock('src/modules/customization-system', () => ({ getSelectedOptionValuesByCustomizationState: () => [] }));
jest.mock('src/modules/a-b-testing', () => ({ A_B_TEST_GROUP_CHANGED: 'a-b-test-changed' }));
jest.mock('src/modules/orders-history', () => ({ FETCH_ORDERS_HISTORY_ACTION: 'orders-history/fetch' }));
jest.mock('src/modules/persisted-customer-data', () => ({ PERSISTED_CUSTOMER_DATA: 'persisted-customer-data' }));
jest.mock('src/modules/shared/helpers/get-cookie-by-name.function', () => ({ __esModule: true, default: () => null }));
jest.mock('storefront-query-builder', () => ({ SearchQuery: class {} }));

Vue.use(Vuex);

describe('GA4 ecommerce listener', () => {
  const item = {
    sku: 'PLUSH-1',
    id: 42,
    name: 'Plushie',
    qty: 2,
    price: 90,
    price_incl_tax: 108,
    original_price: 100,
    original_price_incl_tax: 120,
    type_id: 'simple',
    totals: { base_row_total: 200, base_discount_amount: 20, row_total: 240, discount_amount: 24 },
    category: [{ name: 'Plushies', slug: 'plushies-4', category_id: 4, path: 'plushies/plushies-4' }],
    extension_attributes: { budsies_quote_item_totals: { regular_price: 100, final_price: 90 } }
  };
  const totals = {
    quote_currency_code: 'EUR',
    base_grand_total: 220,
    coupon_code: 'SAVE20',
    shipping_amount: 12,
    tax_amount: 8
  };

  function setup () {
    const pushes: Record<string, any>[] = [];
    const gtm = Object.assign(VueGtm, {
      dataLayer: jest.fn(() => pushes),
      trackEvent: jest.fn((payload) => pushes.push(payload))
    });
    const store = new Store({
      state: {
        cart: { cartItems: [item], platformTotals: totals, exchangeRate: 2, productDiscountedPrice: {} },
        product: { productDiscountedPrice: {} },
        user: { current: null }
      },
      getters: {
        'cart/getCartItems': () => [item],
        'cart/getCartItemPrice': () => () => ({ regular: 999, special: null }),
        'product/getProductPrice': () => () => ({ regular: 240, special: 216 }),
        'product/getProductBySkuDictionary': () => ({ [item.sku]: item }),
        'order/getSessionOrderHashes': () => []
      }
    });

    jest.clearAllMocks();
    new EventBusListener(store, gtm).initEventBusListeners();

    function emit (eventName: string, payload?: unknown) {
      const registration = jest.mocked(EventBus.$on).mock.calls.find(([name]) => name === eventName);
      if (!registration) throw new Error(`Missing ${eventName} listener`);
      return registration[1](payload);
    }

    return { pushes, store, emit };
  }

  it('emits one cleared payload for each checkout step with net item revenue', () => {
    const { pushes, emit } = setup();

    emit('beginCheckout');
    emit('checkout-after-shippingDetails', { shippingMethod: 'ground' });
    emit('checkout-after-paymentDetails', { paymentMethod: 'card' });

    expect(pushes).toHaveLength(6);
    for (let index = 0; index < pushes.length; index += 2) {
      expect(pushes[index]).toEqual({ ecommerce: null });
      expect(pushes[index + 1].ecommerce).toMatchObject({
        currency: 'USD',
        value: 180,
        coupon: 'SAVE20',
        items: [{ item_id: 'PLUSH-1', item_internal_id: 42, item_variant: 'PLUSH-1', price: 90, discount: 10, quantity: 2 }]
      });
    }
    expect(pushes.filter(({ event }) => event === 'begin_checkout')).toHaveLength(1);
    expect(pushes.filter(({ event }) => event === 'add_shipping_info')).toHaveLength(1);
    expect(pushes.filter(({ event }) => event === 'add_payment_info')).toHaveLength(1);
    expect(pushes[3].ecommerce.shipping_tier).toBe('ground');
    expect(pushes[5].ecommerce.payment_type).toBe('card');
    expect(pushes[1].ecommerce.custom_fields.express_checkout).toBe(false);
  });

  it('includes the applied coupon in cart views and clears it after removal', () => {
    const { pushes, emit } = setup();

    emit('cartViewed', { products: [item], platformTotals: totals });
    emit('cartViewed', {
      products: [item],
      platformTotals: { quote_currency_code: 'EUR' }
    });

    expect(pushes).toHaveLength(4);
    expect(pushes[0]).toEqual({ ecommerce: null });
    expect(pushes[1]).toMatchObject({
      event: 'view_cart',
      ecommerce: { currency: 'USD', value: 180, coupon: 'SAVE20' }
    });
    expect(pushes[2]).toEqual({ ecommerce: null });
    expect(pushes[3].event).toBe('view_cart');
    expect(pushes[3].ecommerce.coupon).toBeUndefined();
  });

  it('keeps product and cart-action revenue in USD independently of display exchange rates', () => {
    const { pushes, emit } = setup();

    emit('product-page-show', item);
    jest.mocked(cartHooks.afterAddToCart).mock.calls[0][0]({ cartItem: item as CartItem });
    jest.mocked(cartHooks.afterRemoveFromCart).mock.calls[0][0]({ cartItem: item as CartItem });

    expect(pushes).toHaveLength(6);
    for (let index = 0; index < pushes.length; index += 2) {
      expect(pushes[index]).toEqual({ ecommerce: null });
      expect(pushes[index + 1].ecommerce).toMatchObject({ currency: 'USD', value: 180 });
    }
    expect(pushes[1].event).toBe('view_item');
    expect(pushes[3].event).toBe('add_to_cart');
    expect(pushes[5].event).toBe('remove_from_cart');
  });

  it('uses the placed order after cart state changes and keeps separate USD base tax and shipping', async () => {
    const { pushes, store, emit } = setup();
    const order = {
      products: [item],
      paymentDetails: {
        order_currency_code: 'EUR',
        coupon_code: 'SAVE20',
        base_grand_total: 220,
        base_shipping_amount: 15,
        base_tax_amount: 10,
        base_subtotal: 200,
        base_discount_amount: 20,
        shipping_amount: 12,
        tax_amount: 8
      },
      personalDetails: { emailAddress: 'buyer@example.com', firstName: 'A', lastName: 'B' }
    };

    store.state.cart.cartItems = [];
    store.state.cart.platformTotals = { quote_currency_code: 'USD', base_grand_total: 999 };
    await emit('order-after-placed', { order, confirmation: { magentoOrderId: '10001' } });

    expect(pushes).toHaveLength(2);
    expect(pushes[0]).toEqual({ ecommerce: null });
    expect(pushes[1]).toMatchObject({
      event: 'purchase',
      ecommerce: {
        currency: 'USD',
        transaction_id: '10001',
        value: 180,
        coupon: 'SAVE20',
        shipping: 15,
        tax: 10,
        items: [{ item_id: 'PLUSH-1', price: 90, discount: 10, quantity: 2 }],
        custom_fields: { is_new_customer: true, subtotal_value: 195, affiliate_total: 180 }
      }
    });
  });
});
