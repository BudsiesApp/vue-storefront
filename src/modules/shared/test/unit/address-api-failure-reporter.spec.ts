import config from 'config';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { REPORT_ERROR, reportAddressApiFailure } from '../../services/address-api-failure-reporter';

jest.mock('config', () => ({ errorLogging: { serviceUrl: 'https://graylog.example.com' } }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({ __esModule: true, default: { $emit: jest.fn() } }));

describe('reportAddressApiFailure', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    (EventBus.$emit as jest.Mock).mockReset();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    config.errorLogging.serviceUrl = 'https://graylog.example.com';
    window.history.replaceState({}, '', '/address-page?token=secret#details');
  });

  afterEach(() => {
    warn.mockRestore();
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

  it('writes a contextual console warning even when error logging is not configured', () => {
    config.errorLogging.serviceUrl = '';

    reportAddressApiFailure({ operation: 'customer-address-update', message: 'Service unavailable', status: 503, userId: 4, addressId: 9 });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Address API failure:', 'Service unavailable', {
      operation: 'customer-address-update',
      endpoint: '/address/update',
      status: 503,
      userId: 4,
      addressId: 9
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('token');
    expect(EventBus.$emit).not.toHaveBeenCalled();
  });

  it('writes no console warning for expected 4xx failures', () => {
    reportAddressApiFailure({ operation: 'customer-address-update', message: 'Not found', status: 404 });

    expect(warn).not.toHaveBeenCalled();
  });
});
