import { sendErrorMessage } from '../../services/errorSender';

jest.mock('config', () => ({ errorLogging: { serviceUrl: 'https://graylog.example.com' } }));
jest.mock('src/modules/budsies', () => ({
  debugData: { getDebugData: () => ({ instanceId: 'instance', appVersion: '1' }) }
}));

describe('address Graylog fields', () => {
  it('sends only the allowlisted address context as structured fields', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 202 });
    global.fetch = fetchMock;

    await sendErrorMessage({
      shortMessage: 'Address API failure: order-address-update 503 4 7 9',
      fullMessage: 'Address API request failed',
      currentUrl: `${window.location.origin}/address-page`,
      context: {
        operation: 'order-address-update',
        endpoint: '/order/address/update-requests',
        status: 503,
        userId: 4,
        orderId: 7,
        addressId: 9
      }
    }, 'browser', 'Unable to resolve ip', 'trace');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[0][0]).toBe('https://graylog.example.com');
    expect(Object.keys(body).filter(key => ['_operation', '_endpoint', '_status', '_userId', '_orderId', '_addressId'].includes(key))).toEqual([
      '_operation', '_endpoint', '_status', '_userId', '_orderId', '_addressId'
    ]);
    expect(body).toMatchObject({
      _operation: 'order-address-update',
      _endpoint: '/order/address/update-requests',
      _status: 503,
      _userId: 4,
      _orderId: 7,
      _addressId: 9,
      _current_url: `${window.location.origin}/address-page`
    });
    expect(JSON.stringify(body)).not.toContain('token=');
  });
});
