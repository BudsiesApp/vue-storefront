import rootStore from '@vue-storefront/core/store'

import ErrorMessage from '../type/ErrorMessage';
import { SN_ERROR_LOGGING } from '../type/StoreMutations';
import resolveIp from '../helpers/resolveIp';
import { checkMessageAlreadySent, keepMessage, removeMessage } from './sentMessagesKeeper'
import { sendErrorMessage } from './errorSender';

let clientIpCache: string | undefined;

async function resolveIpWithCache (): Promise<string> {
  if (clientIpCache) {
    return clientIpCache;
  }

  clientIpCache = await resolveIp();

  return clientIpCache;
}

async function deliver (errorMessage: ErrorMessage): Promise<void> {
  const messageAlreadySent = checkMessageAlreadySent(errorMessage);
  const userAgent = navigator.userAgent;

  if (messageAlreadySent || userAgent.toLowerCase().includes('bot')) {
    return;
  }

  const clientIp = await resolveIpWithCache().catch(() => 'Unable to resolve ip');

  await keepMessage(errorMessage);

  const traceId = rootStore.getters[`${SN_ERROR_LOGGING}/traceId`];

  try {
    await sendErrorMessage(errorMessage, userAgent, clientIp, traceId);
  } catch (e) {
    await removeMessage(errorMessage);
  }
}

export default async function logError (errorMessage: ErrorMessage): Promise<void> {
  try {
    await deliver(errorMessage);
  } catch {
    // Reporting must never raise a new error into the page.
  }
}
