import { TaskQueue } from '@vue-storefront/core/lib/sync';
import TaskResponseError from '@vue-storefront/core/lib/sync/types/TaskResponseError';
import { reportAddressApiFailure } from 'src/modules/shared';

import { actions } from '../../store/actions';
import {
  REQUEST_ORDER_SHIPPING_ADDRESS_UPDATE,
  REQUEST_ORDER_SHIPPING_ADDRESS_CONFIRMATION
} from '../../types/store/actions';

jest.mock('config', () => ({ budsies: { endpoint: 'https://api.example.com' } }));
jest.mock('@vue-storefront/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));
jest.mock('@vue-storefront/core/helpers', () => ({ processURLAddress: (url: string) => url }));
jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: { execute: jest.fn() } }));
jest.mock('src/modules/shared', () => ({
  ...jest.requireActual('src/modules/shared/helpers/get-api-error-message'),
  reportAddressApiFailure: jest.fn()
}));

describe('order address failures', () => {
  const context = { rootGetters: { 'user/current': { id: 4 } } };

  beforeEach(() => {
    (TaskQueue.execute as jest.Mock).mockReset();
    (reportAddressApiFailure as jest.Mock).mockClear();
  });

  it('preserves a 400 server message and passes numeric IDs for reporting decisions', async () => {
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 400, result: { errorMessage: 'Address locked' } });

    await expect((actions as any)[REQUEST_ORDER_SHIPPING_ADDRESS_UPDATE](context, {
      address: { entity_id: 9, parent_id: 7 }
    })).rejects.toThrow('Address locked');

    expect(reportAddressApiFailure).toHaveBeenCalledWith({
      operation: 'order-address-update', message: 'Address locked', status: 400, userId: 4, orderId: 7, addressId: 9
    });
    expect((TaskQueue.execute as jest.Mock).mock.calls[0][0].silent).toBe(true);
  });

  it('uses the fallback for missing confirmation messages', async () => {
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 503, result: {} });

    await expect((actions as any)[REQUEST_ORDER_SHIPPING_ADDRESS_CONFIRMATION](context, {
      addressId: 9, orderId: 7
    })).rejects.toThrow('Unable to confirm address');
    expect(reportAddressApiFailure).toHaveBeenCalledWith({
      operation: 'order-address-confirmation', message: 'Unable to confirm address', status: 503, userId: 4, orderId: 7, addressId: 9
    });
  });

  it('uses the fallback instead of an object-valued server message', async () => {
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 500, result: { errorMessage: { code: 'ECONNREFUSED' } } });

    await expect((actions as any)[REQUEST_ORDER_SHIPPING_ADDRESS_UPDATE](context, {
      address: { entity_id: 9, parent_id: 7 }
    })).rejects.toThrow(new Error('Unable to update order shipping address'));
    expect(reportAddressApiFailure).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Unable to update order shipping address', status: 500
    }));
  });

  it.each([403, 503])('keeps the HTTP %i status of a non-JSON response', async (status) => {
    (TaskQueue.execute as jest.Mock).mockRejectedValue(new TaskResponseError('Error with response - bad content-type!', status));

    await expect((actions as any)[REQUEST_ORDER_SHIPPING_ADDRESS_CONFIRMATION](context, {
      addressId: 9, orderId: 7
    })).rejects.toThrow(new Error('Unable to confirm address'));
    expect(reportAddressApiFailure).toHaveBeenCalledWith(expect.objectContaining({ status }));
  });
});

