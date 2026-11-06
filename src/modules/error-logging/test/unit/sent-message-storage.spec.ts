import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import logError from '../../services/errorLogger';
import { sendErrorMessage } from '../../services/errorSender';
import { restoreMessagesFromStorage } from '../../services/sentMessagesKeeper';

const storage = { getItem: jest.fn(), setItem: jest.fn() };

jest.mock('@vue-storefront/core/store', () => ({ __esModule: true, default: { getters: {} } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));
jest.mock('../../helpers/resolveIp', () => ({ __esModule: true, default: jest.fn().mockResolvedValue('127.0.0.1') }));
jest.mock('../../services/errorSender', () => ({ sendErrorMessage: jest.fn() }));

function createReport (shortMessage: string) {
  return { shortMessage, fullMessage: 'details', currentUrl: `${window.location.origin}/address-page` };
}

describe('sent-message storage failures', () => {
  beforeEach(async () => {
    (StorageManager.get as jest.Mock).mockReturnValue(storage);
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue(undefined);
    (sendErrorMessage as jest.Mock).mockReset().mockResolvedValue(undefined);
    await restoreMessagesFromStorage();
  });

  it('still sends a report when the storage write rejects', async () => {
    storage.setItem.mockRejectedValue(new DOMException('Quota exceeded', 'QuotaExceededError'));

    await expect(logError(createReport('Quota report'))).resolves.toBeUndefined();

    expect(sendErrorMessage).toHaveBeenCalledTimes(1);
  });

  it('does not count a failed delivery as sent after a storage failure', async () => {
    storage.setItem.mockRejectedValue(new DOMException('Quota exceeded', 'QuotaExceededError'));
    (sendErrorMessage as jest.Mock).mockRejectedValueOnce(new Error('Graylog unavailable'));

    await logError(createReport('Retry report'));
    await logError(createReport('Retry report'));

    expect(sendErrorMessage).toHaveBeenCalledTimes(2);
  });

  it('suppresses an identical report after successful delivery', async () => {
    storage.setItem.mockRejectedValue(new DOMException('Quota exceeded', 'QuotaExceededError'));

    await logError(createReport('Delivered report'));
    await logError(createReport('Delivered report'));

    expect(sendErrorMessage).toHaveBeenCalledTimes(1);
  });

  it('starts with an empty list when stored messages cannot be restored', async () => {
    storage.getItem.mockResolvedValue('{not json');

    await expect(restoreMessagesFromStorage()).resolves.toBeUndefined();
    await logError(createReport('After restore failure'));

    expect(sendErrorMessage).toHaveBeenCalledTimes(1);
  });
});
