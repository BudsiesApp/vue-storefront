import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import logError from '../../services/errorLogger';
import { sendErrorMessage } from '../../services/errorSender';
import { restoreMessagesFromStorage } from '../../services/sentMessagesKeeper';

const quotaExceeded = new DOMException('Quota exceeded', 'QuotaExceededError');
let storedValue: string | null = null;
const storage = {
  getItem: jest.fn(async () => storedValue),
  setItem: jest.fn(async (_key: string, value: string) => {
    storedValue = value;
  })
};

jest.mock('@vue-storefront/core/store', () => ({ __esModule: true, default: { getters: {} } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));
jest.mock('../../helpers/resolveIp', () => ({ __esModule: true, default: jest.fn().mockResolvedValue('127.0.0.1') }));
jest.mock('../../services/errorSender', () => ({ sendErrorMessage: jest.fn() }));

function createReport (shortMessage: string) {
  return { shortMessage, fullMessage: 'details', currentUrl: `${window.location.origin}/address-page` };
}

function failStorageWrites (): void {
  storage.setItem.mockImplementation(async () => {
    throw quotaExceeded;
  });
}

describe('sent-message storage failures', () => {
  beforeEach(async () => {
    storedValue = null;
    (StorageManager.get as jest.Mock).mockReturnValue(storage);
    storage.setItem.mockImplementation(async (_key: string, value: string) => {
      storedValue = value;
    });
    (sendErrorMessage as jest.Mock).mockReset().mockResolvedValue(undefined);
    await restoreMessagesFromStorage();
  });

  it('still sends a report when the storage write rejects', async () => {
    failStorageWrites();

    await expect(logError(createReport('Quota report'))).resolves.toBeUndefined();

    expect(sendErrorMessage).toHaveBeenCalledTimes(1);
  });

  it('does not count a failed delivery as sent after a storage failure', async () => {
    failStorageWrites();
    (sendErrorMessage as jest.Mock).mockRejectedValueOnce(new Error('Graylog unavailable'));

    await logError(createReport('Retry report'));
    await logError(createReport('Retry report'));

    expect(sendErrorMessage).toHaveBeenCalledTimes(2);
  });

  it('does not restore a failed delivery as sent when later storage writes fail', async () => {
    (sendErrorMessage as jest.Mock).mockImplementationOnce(async () => {
      failStorageWrites();
      throw new Error('Graylog unavailable');
    });

    await logError(createReport('Undelivered report'));
    await restoreMessagesFromStorage();
    await logError(createReport('Undelivered report'));

    expect(sendErrorMessage).toHaveBeenCalledTimes(2);
  });

  it('persists a delivered report and suppresses it after a reload', async () => {
    await logError(createReport('Delivered report'));
    await restoreMessagesFromStorage();
    await logError(createReport('Delivered report'));

    expect(sendErrorMessage).toHaveBeenCalledTimes(1);
  });

  it('suppresses an identical report while the first one is being delivered', async () => {
    await Promise.all([
      logError(createReport('Concurrent report')),
      logError(createReport('Concurrent report'))
    ]);

    expect(sendErrorMessage).toHaveBeenCalledTimes(1);
  });

  it('starts with an empty list when stored messages cannot be restored', async () => {
    storedValue = '{not json';

    await expect(restoreMessagesFromStorage()).resolves.toBeUndefined();
    await logError(createReport('After restore failure'));

    expect(sendErrorMessage).toHaveBeenCalledTimes(1);
  });
});
