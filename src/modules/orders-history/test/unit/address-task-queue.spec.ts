import fetch from '@vue-storefront/core/lib/fetch';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { REPORT_ERROR } from 'src/modules/shared';

import { actions } from '../../store/actions';
import { REQUEST_ORDER_SHIPPING_ADDRESS_UPDATE } from '../../types/store/actions';

jest.mock('config', () => ({
  budsies: { endpoint: 'https://api.example.com' },
  errorLogging: { serviceUrl: 'https://graylog.example.com' },
  storeViews: { multistore: false },
  users: { tokenInHeader: false },
  queues: { maxNetworkTaskAttempts: 1 },
  syncTasks: {}
}));
jest.mock('@vue-storefront/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));
jest.mock('@vue-storefront/core/lib/fetch', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@vue-storefront/core/store', () => ({ __esModule: true, default: { state: {}, getters: {}, dispatch: jest.fn() } }));
jest.mock('@vue-storefront/core/lib/multistore', () => ({ adjustMultistoreApiUrl: (url: string) => url, currentStoreView: () => ({}) }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({ __esModule: true, default: { $emit: jest.fn() } }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: () => () => {}, info: () => () => {}, debug: () => () => {}, log: () => () => {} } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: {} }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false, processURLAddress: (url: string) => url, serial: jest.fn(), onlineHelper: {} }));
jest.mock('src/modules/shared', () => ({
  BEFORE_STORE_BACKEND_API_REQUEST: 'before-request',
  ...jest.requireActual('src/modules/shared/helpers/get-api-error-message'),
  ...jest.requireActual('src/modules/shared/services/address-api-failure-reporter')
}));

const context = { rootGetters: { 'user/current': { id: 4 } } };
const address = { entity_id: 9, parent_id: 7 };

function respondWithJsonWithoutCode (status: number): void {
  (fetch as jest.Mock).mockResolvedValue({
    status,
    headers: { get: () => 'application/json' },
    json: async () => ({ message: 'Forbidden' })
  });
}

function getReports () {
  return (EventBus.$emit as jest.Mock).mock.calls.filter(([event]) => event === REPORT_ERROR);
}

describe('order address update through TaskQueue', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    (EventBus.$emit as jest.Mock).mockClear();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('treats a JSON 403 without a VSF API code as an expected failure', async () => {
    respondWithJsonWithoutCode(403);

    await expect((actions as any)[REQUEST_ORDER_SHIPPING_ADDRESS_UPDATE](context, { address }))
      .rejects.toThrow(new Error('Unable to update order shipping address'));
    expect(warn).not.toHaveBeenCalled();
    expect(getReports()).toHaveLength(0);
  });

  it('reports a JSON 503 without a VSF API code with its HTTP status', async () => {
    respondWithJsonWithoutCode(503);

    await expect((actions as any)[REQUEST_ORDER_SHIPPING_ADDRESS_UPDATE](context, { address }))
      .rejects.toThrow(new Error('Unable to update order shipping address'));
    expect(warn).toHaveBeenCalledWith('Address API failure:', 'Unable to update order shipping address', expect.objectContaining({ status: 503 }));
    expect(getReports()).toHaveLength(1);
    expect(getReports()[0][1].context).toMatchObject({ status: 503, orderId: 7, addressId: 9, userId: 4 });
  });
});
