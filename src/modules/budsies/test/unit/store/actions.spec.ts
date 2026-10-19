import { processURLAddress } from '@vue-storefront/core/helpers';
import { TaskQueue } from '@vue-storefront/core/lib/sync';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { reportAddressApiFailure } from 'src/modules/shared';

import { actions } from '../../../store/actions';

jest.mock('config', () => ({
  budsies: {
    endpoint: 'https://api.example.com/api/ext/budsies'
  }
}));

jest.mock('@vue-storefront/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key }
}));

jest.mock('src/modules/shared', () => ({
  reportAddressApiFailure: jest.fn()
}));

jest.mock('@vue-storefront/core/helpers', () => ({
  processURLAddress: jest.fn((url: string) => url)
}));

jest.mock('@vue-storefront/core/lib/sync', () => ({
  TaskQueue: {
    execute: jest.fn()
  }
}));

jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true,
  default: {
    $emit: jest.fn(),
    $off: jest.fn(),
    $on: jest.fn(),
    $once: jest.fn()
  }
}));

describe('Budsies cart recovery actions', () => {
  beforeEach(() => {
    (processURLAddress as jest.Mock).mockClear();
    (TaskQueue.execute as jest.Mock).mockReset();
    (TaskQueue.execute as jest.Mock).mockResolvedValue({
      result: 'cart-token',
      resultCode: 200
    });
  });

  it('URL-encodes and forwards the optional promo-code instruction', async () => {
    await (actions as any).loadRecoverableCart({}, {
      recoveryId: 'recovery-id',
      recoveryCode: 'recovery-code',
      applyPromoCode: 'true&source=recovery link'
    });

    expect((TaskQueue.execute as jest.Mock).mock.calls[0][0].url).toBe(
      'https://api.example.com/api/ext/budsies/carts/recovery-requests?recoveryId=recovery-id&recoveryCode=recovery-code&token={{token}}&applyPromoCode=true%26source%3Drecovery%20link'
    );
  });

  it('preserves the existing request URL when the instruction is absent', async () => {
    await (actions as any).loadRecoverableCart({}, {
      recoveryId: 'recovery-id',
      recoveryCode: 'recovery-code'
    });

    expect((TaskQueue.execute as jest.Mock).mock.calls[0][0].url).toBe(
      'https://api.example.com/api/ext/budsies/carts/recovery-requests?recoveryId=recovery-id&recoveryCode=recovery-code&token={{token}}'
    );
  });
});

describe('customer address failures', () => {
  const context = { rootGetters: { 'user/current': { id: 4 } } };

  beforeEach(() => {
    (TaskQueue.execute as jest.Mock).mockReset();
    (reportAddressApiFailure as jest.Mock).mockClear();
    (EventBus.$emit as jest.Mock).mockClear();
  });

  it('preserves the server message and reports a failed update without emitting success', async () => {
    (TaskQueue.execute as jest.Mock).mockResolvedValue({ resultCode: 503, result: { errorMessage: 'Service unavailable' } });

    await expect((actions as any).updateAddress(context, { address: { id: 9 } })).rejects.toThrow('Service unavailable');
    expect(reportAddressApiFailure).toHaveBeenCalledWith({ operation: 'customer-address-update', message: 'Service unavailable', status: 503, userId: 4, addressId: 9 });
    expect((TaskQueue.execute as jest.Mock).mock.calls[0][0].silent).toBe(true);
    expect(EventBus.$emit).not.toHaveBeenCalled();
  });

  it('uses the translated fallback for a no-response create failure', async () => {
    (TaskQueue.execute as jest.Mock).mockRejectedValue(new Error('network details'));

    await expect((actions as any).createNewAddress(context, { address: {} })).rejects.toThrow('Unable to add new address');
    expect(reportAddressApiFailure).toHaveBeenCalledWith({ operation: 'customer-address-create', message: 'Unable to add new address', status: undefined, userId: 4 });
    expect(EventBus.$emit).not.toHaveBeenCalled();
  });
});
