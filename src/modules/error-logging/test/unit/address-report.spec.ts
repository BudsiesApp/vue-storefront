import logError from '../../services/errorLogger';
import { sendErrorMessage } from '../../services/errorSender';
import resolveIp from '../../helpers/resolveIp';

jest.mock('@vue-storefront/core/store', () => ({
  __esModule: true,
  default: { getters: {} }
}));
jest.mock('../../helpers/resolveIp', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../services/sentMessagesKeeper', () => ({
  checkMessageAlreadySent: jest.fn(() => false),
  keepMessage: jest.fn(),
  removeMessage: jest.fn()
}));
jest.mock('../../services/errorSender', () => ({ sendErrorMessage: jest.fn() }));

describe('address error delivery', () => {
  it('continues to the Graylog sender when IP lookup rejects', async () => {
    (resolveIp as jest.Mock).mockRejectedValue(new Error('IP service unavailable'));
    (sendErrorMessage as jest.Mock).mockResolvedValue(undefined);
    const report = {
      shortMessage: 'Address API failure: customer-address-create 503',
      fullMessage: 'Address API request failed',
      currentUrl: `${window.location.origin}/address-page`,
      context: {
        operation: 'customer-address-create' as const,
        endpoint: '/address/create' as const,
        status: 503
      }
    };

    await logError(report);

    expect(sendErrorMessage).toHaveBeenCalledWith(
      report,
      navigator.userAgent,
      'Unable to resolve ip',
      undefined
    );
  });
});
