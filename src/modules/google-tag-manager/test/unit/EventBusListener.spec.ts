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
jest.mock('@vue-storefront/core/modules/cart/helpers', () => ({
  productsEquals: (left: { sku: string }, right: { sku: string }) => left.sku === right.sku
}));
jest.mock('@vue-storefront/core/modules/catalog', () => ({ GET_PRODUCT_PRICE: 'product/getProductPrice' }));
jest.mock('@vue-storefront/core/modules/catalog/helpers', () => ({
  isBundleProduct: (product: { type_id: string }) => product.type_id === 'bundle'
}));
jest.mock('@vue-storefront/core/filters', () => ({ price: jest.fn() }));
jest.mock('@vue-storefront/core/modules/checkout', () => ({ ORDER_ERROR_EVENT: 'order-error' }));
jest.mock('src/modules/shared', () => ({
  PriceHelper: jest.requireActual('@vue-storefront/core/helpers/price'),
  DEFAULT_CURRENCY_CODE: 'USD',
  normalizeProductPurchaseFlow: jest.requireActual('src/modules/shared/types/product-purchase-flow.type').normalizeProductPurchaseFlow,
  ProductEvent: { PRODUCT_CARD_CLICK: 'product-card-click', PRODUCT_LIST_SHOW: 'product-list-show', PRODUCT_PAGE_SHOW: 'product-page-show' },
  UserEvents: { CUSTOMER_DATA_CHANGED: 'customer-data-changed' }
}));
jest.mock('src/modules/budsies', () => ({ PlushieWizardEvents: { PLUSHIE_WIZARD_INFO_FILL: 'plushieWizardInfoFill' } }));
jest.mock('src/modules/customization-system', () => jest.requireActual(
  'src/modules/customization-system/helpers/get-selected-options-values-by-customization-state'
));
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

  const customerData = {
    id: '5',
    email: 'Account@Example.com',
    firstName: 'A',
    lastName: 'B',
    phoneNumber: '',
    billingAddress: { firstName: 'A', lastName: 'B', phoneNumber: '', city: '', state: '', zipCode: '', country: '' }
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
        'order/getSessionOrderHashes': () => [],
        'persisted-customer-data': () => customerData
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

  it('emits one cleared payload for each checkout step with the cart grand total', () => {
    const { pushes, emit } = setup();

    emit('beginCheckout');
    emit('checkout-after-shippingDetails', { shippingMethod: 'ground' });
    emit('checkout-after-paymentDetails', { paymentMethod: 'card' });

    expect(pushes).toHaveLength(6);
    for (let index = 0; index < pushes.length; index += 2) {
      expect(pushes[index]).toEqual({ ecommerce: null });
      expect(pushes[index + 1].ecommerce).toMatchObject({
        currency: 'EUR',
        value: 220,
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

  it('pushes checkout events without a coupon while cart totals are unavailable', () => {
    const { pushes, store, emit } = setup();

    store.state.cart.platformTotals = null;
    emit('beginCheckout');
    emit('checkout-after-shippingDetails', { shippingMethod: 'ground' });
    emit('checkout-after-paymentDetails', { paymentMethod: 'card' });

    expect(pushes.map(({ event }) => event).filter(Boolean)).toEqual(['begin_checkout', 'add_shipping_info', 'add_payment_info']);
    for (const push of pushes.filter(({ event }) => event)) {
      expect(push.ecommerce.coupon).toBeUndefined();
      expect(push.ecommerce.items).toHaveLength(1);
    }
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
      ecommerce: { currency: 'EUR', value: 220, coupon: 'SAVE20' }
    });
    expect(pushes[2]).toEqual({ ecommerce: null });
    expect(pushes[3].event).toBe('view_cart');
    expect(pushes[3].ecommerce).toMatchObject({ currency: 'EUR', value: 0 });
    expect(pushes[3].ecommerce.coupon).toBeUndefined();
  });

  it('keeps product and line price values for product and cart-action events', () => {
    const { pushes, emit } = setup();

    emit('product-page-show', item);
    jest.mocked(cartHooks.afterRemoveFromCart).mock.calls[0][0]({ cartItem: item as CartItem });

    expect(pushes).toHaveLength(4);
    expect(pushes[0]).toEqual({ ecommerce: null });
    expect(pushes[1]).toMatchObject({ event: 'view_item', ecommerce: { currency: 'USD', value: 216 } });
    expect(pushes[2]).toEqual({ ecommerce: null });
    expect(pushes[3]).toMatchObject({
      event: 'remove_from_cart',
      ecommerce: { currency: 'USD', value: 999, items: [{ price: 90, discount: 10, quantity: 2 }] }
    });
  });

  it('reports the composed variant, internal ID, and purchase flow of a customized bundle', () => {
    const { pushes, emit } = setup();
    const bundle = {
      ...item,
      sku: 'PILLOW',
      id: 77,
      type_id: 'bundle',
      customizations: [
        { id: 'size', bundleOptionId: 1, optionData: { values: [{ id: 'large', sku: 'SIZE-L' }, { id: 'small', sku: 'SIZE-S' }] } },
        { id: 'extras', bundleOptionId: 2, optionData: { values: [{ id: 'bow', sku: 'BOW' }, { id: 'tag', sku: 'ACC-TAG' }] } },
        { id: 'note', optionData: { values: [{ id: 'gift', sku: 'NOTE' }] } }
      ],
      extension_attributes: {
        ...item.extension_attributes,
        flow: 'customize-later',
        customization_state: [
          { customization_id: 'size', value: 'large' },
          { customization_id: 'extras', value: ['tag', 'bow'] },
          { customization_id: 'note', value: 'gift' }
        ]
      }
    };

    emit('cartViewed', { products: [bundle], platformTotals: totals });

    expect(pushes[1].ecommerce.items).toEqual([expect.objectContaining({
      item_id: 'PILLOW',
      item_internal_id: 77,
      item_variant: 'PILLOW-ACC-TAG-BOW-SIZE-L',
      purchase_flow: 'customize-later'
    })]);
  });

  it('hashes the customer email on login and clears both hashes for a blank email', () => {
    const { pushes, emit } = setup();

    emit('user-after-loggedin');
    customerData.email = '  ';
    emit('customer-data-changed', customerData);
    customerData.email = 'Account@Example.com';

    expect(pushes).toHaveLength(2);
    expect(pushes[0]).toMatchObject({
      event: 'login',
      customerEmailHashed: expect.stringMatching(/^[0-9a-f]{64}$/),
      customerEmailHashedSha3: expect.stringMatching(/^[0-9a-f]{64}$/)
    });
    expect(pushes[0].customerEmailHashed).not.toBe(pushes[0].customerEmailHashedSha3);
    expect(pushes[1].event).toBe('user_data_changed');
    expect(pushes[1]).toHaveProperty('customerEmailHashed', undefined);
    expect(pushes[1]).toHaveProperty('customerEmailHashedSha3', undefined);
  });

  it('hashes the wizard-supplied email before the wizard event', () => {
    const { pushes, emit } = setup();

    emit('plushieWizardInfoFill', { plushieType: 'Forevers', customerEmail: 'buyer@example.com' });

    expect(pushes.map(({ event }) => event)).toEqual(['user_data_changed', 'ForeversWizardInfoFill']);
    expect(pushes[0]).toMatchObject({
      customerId: '5',
      customerEmail: 'buyer@example.com',
      customerEmailHashed: '6a6c26195c3682faa816966af789717c3bfa834eee6c599d667d2b3429c27cfd',
      customerEmailHashedSha3: 'd4b9c0cb38c01dfbde5eedb8053b34ca3e180b4a0646a168b39e899474c00887'
    });
  });

  it('uses the placed order after cart state changes and keeps the order grand total and currency', async () => {
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
        currency: 'EUR',
        transaction_id: '10001',
        value: 220,
        coupon: 'SAVE20',
        shipping: 15,
        tax: 10,
        items: [{ item_id: 'PLUSH-1', price: 90, discount: 10, quantity: 2 }],
        custom_fields: { is_new_customer: true, subtotal_value: 195, affiliate_total: 180 }
      },
      customerEmail: 'buyer@example.com',
      customerEmailHashed: '6a6c26195c3682faa816966af789717c3bfa834eee6c599d667d2b3429c27cfd',
      customerEmailHashedSha3: 'd4b9c0cb38c01dfbde5eedb8053b34ca3e180b4a0646a168b39e899474c00887'
    });
  });
});
