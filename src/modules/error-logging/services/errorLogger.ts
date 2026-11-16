import rootStore from '@vue-storefront/core/store'

import ErrorMessage from '../type/ErrorMessage';
import { SN_ERROR_LOGGING } from '../type/StoreMutations';
import resolveIp from '../helpers/resolveIp';
import {
  checkMessageAlreadySent,
  keepSentMessage,
  markMessagePending,
  releasePendingMessage
} from './sentMessagesKeeper'
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
  const userAgent = navigator.userAgent;

  if (checkMessageAlreadySent(errorMessage) || userAgent.toLowerCase().includes('bot')) {
    return;
  }

  markMessagePending(errorMessage);

  try {
    const clientIp = await resolveIpWithCache().catch(() => 'Unable to resolve ip');
    const traceId = rootStore.getters[`${SN_ERROR_LOGGING}/traceId`];

    await sendErrorMessage(errorMessage, userAgent, clientIp, traceId);
    await keepSentMessage(errorMessage);
  } finally {
    releasePendingMessage(errorMessage);
  }
}

export default async function logError (errorMessage: ErrorMessage): Promise<void> {
  try {
    await deliver(errorMessage);
  } catch {
    // Reporting must never raise a new error into the page.
  }
}
