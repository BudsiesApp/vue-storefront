import { prepareShippingInfoForUpdateTotals } from '@vue-storefront/core/modules/cart/helpers';
import totalsActions from '@vue-storefront/core/modules/cart/store/actions/totalsActions';
import { createContextMock } from '@vue-storefront/unit-tests/utils';

jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: { info: jest.fn(() => () => {}) }
}));
jest.mock('@vue-storefront/core/data-resolver', () => ({ CartService: {} }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true,
  default: { $emit: jest.fn() }
}));
jest.mock('@vue-storefront/core/modules/cart/helpers', () => ({
  preparePaymentMethodsToSync: jest.fn(),
  prepareShippingInfoForUpdateTotals: jest.fn(),
  createOrderData: jest.fn(),
  createShippingInfoData: jest.fn(),
  getAvailableShippingMethod: jest.fn()
}));
jest.mock('../../../helpers/is-cart-not-found-error', () => ({ isCartNotFoundError: () => false }));

describe('Cart totals item refresh', () => {
  const cartItem = {
    server_item_id: 7,
    sku: 'PLUSH-1',
    extension_attributes: {
      plushie_id: '15',
      flow: 'standard',
      customization_state: [{ customization_id: '1', value: '2' }],
      budsies_quote_item_totals: { regular_price: 100, final_price: 100 }
    }
  };

  async function overrideWith (totalsItem: Record<string, any>) {
    const contextMock = createContextMock({ getters: { getCartItems: [cartItem] } });

    (contextMock.dispatch as jest.Mock).mockImplementationOnce(async () => ({
      resultCode: 200,
      result: { totals: { total_segments: {} } }
    }));
    (prepareShippingInfoForUpdateTotals as jest.Mock).mockImplementation(() => ({ 7: totalsItem }));

    await (totalsActions as any).overrideServerTotals(contextMock, { addressInformation: {}, hasShippingInformation: true });

    return (contextMock.dispatch as jest.Mock).mock.calls[1];
  }

  it.each([
    ['applying', { regular_price: 100, savings_amount: 0, discount_amount: -10, final_price: 90 }],
    ['removing', { regular_price: 100, savings_amount: 0, discount_amount: 0, final_price: 100 }]
  ])('merges recalculated item totals after %s a coupon', async (_, itemTotals) => {
    const totalsItem = { item_id: 7, qty: 2, extension_attributes: { budsies_quote_item_totals: itemTotals } };

    expect(await overrideWith(totalsItem)).toEqual(['updateItem', {
      product: {
        server_item_id: 7,
        qty: 2,
        totals: totalsItem,
        extension_attributes: {
          plushie_id: '15',
          flow: 'standard',
          customization_state: [{ customization_id: '1', value: '2' }],
          budsies_quote_item_totals: itemTotals
        }
      }
    }]);
  });

  it('keeps the existing item totals when the response has none', async () => {
    const totalsItem = { item_id: 7, qty: 2 };

    expect(await overrideWith(totalsItem)).toEqual(['updateItem', {
      product: { server_item_id: 7, qty: 2, totals: totalsItem }
    }]);
  });

  it('keeps the response item unchanged when no cart item matches it', async () => {
    const totalsItem = { item_id: 8, qty: 1, extension_attributes: { budsies_quote_item_totals: { final_price: 5 } } };

    expect(await overrideWith(totalsItem)).toEqual(['updateItem', {
      product: { server_item_id: 8, qty: 1, totals: totalsItem }
    }]);
  });
});
