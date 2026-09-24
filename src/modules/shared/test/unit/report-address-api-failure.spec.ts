import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { REPORT_ERROR, reportAddressApiFailure } from '../../helpers/report-address-api-failure';

jest.mock('config', () => ({ errorLogging: { serviceUrl: 'https://graylog.example.com' } }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({ __esModule: true, default: { $emit: jest.fn() } }));

describe('reportAddressApiFailure', () => {
  beforeEach(() => {
    (EventBus.$emit as jest.Mock).mockReset();
    window.history.replaceState({}, '', '/address-page?token=secret#details');
  });

  it('reports numeric string 5xx with only controlled context and a clean page URL', () => {
    reportAddressApiFailure({
      operation: 'order-address-update',
      message: 'Service unavailable',
      status: '503',
      userId: 4,
      orderId: 7,
      addressId: 9
    });

    expect(EventBus.$emit).toHaveBeenCalledWith(REPORT_ERROR, {
      shortMessage: 'Service unavailable order-address-update 503 4 7 9',
      fullMessage: 'Service unavailable',
      currentUrl: `${window.location.origin}/address-page`,
      context: {
        operation: 'order-address-update',
        endpoint: '/order/address/update-requests',
        status: 503,
        userId: 4,
        orderId: 7,
        addressId: 9
      }
    });
  });

  it('skips 4xx and reports no-response failures without unavailable IDs', () => {
    reportAddressApiFailure({ operation: 'customer-address-create', message: 'Bad request', status: 400 });
    expect(EventBus.$emit).not.toHaveBeenCalled();

    reportAddressApiFailure({ operation: 'customer-address-create', message: 'Unable to add new address' });
    expect((EventBus.$emit as jest.Mock).mock.calls[0][1].context).toEqual({
      operation: 'customer-address-create',
      endpoint: '/address/create',
      status: 'none'
    });
  });

});
