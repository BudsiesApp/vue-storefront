import { StorageManager } from '@vue-storefront/core/lib/storage-manager'

import getMessageHash from '../helpers/getMessageHash';
import ErrorMessage from '../type/ErrorMessage';
import LOCAL_STORAGE_KEY from '../type/LocalStorageKey';
import SentMessage from '../type/SentMessage';

const KEEPING_LIMIT = 10;
let sentMessages: SentMessage[] = [];
const pendingHashes = new Set<string>();

async function saveMessagesInLocalStorage (): Promise<void> {
  try {
    const errorLoggingStorage = StorageManager.get(LOCAL_STORAGE_KEY);

    await errorLoggingStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sentMessages));
  } catch {
    // Persistence is best effort: the in-memory list still prevents duplicates.
  }
}

async function readMessagesFromLocalStorage (): Promise<SentMessage[]> {
  try {
    const errorLoggingStorage = StorageManager.get(LOCAL_STORAGE_KEY);
    const storageValue = await errorLoggingStorage.getItem(LOCAL_STORAGE_KEY);

    if (!storageValue) {
      return [];
    }

    const data = JSON.parse(storageValue);

    return data
      .map((item: any) => new SentMessage(item.hash, item.expirationTime))
      .filter((message: SentMessage) => !message.isExpired);
  } catch {
    return [];
  }
}

export function checkMessageAlreadySent (errorMessage: ErrorMessage): boolean {
  const hash = getMessageHash(errorMessage);

  if (pendingHashes.has(hash)) {
    return true;
  }

  const message = sentMessages.find((sentMessage) => sentMessage.hash === hash);

  return !!message && !message.isExpired;
}

export function markMessagePending (errorMessage: ErrorMessage): void {
  pendingHashes.add(getMessageHash(errorMessage));
}

export function releasePendingMessage (errorMessage: ErrorMessage): void {
  pendingHashes.delete(getMessageHash(errorMessage));
}

export async function keepSentMessage (errorMessage: ErrorMessage): Promise<void> {
  const hash = getMessageHash(errorMessage);

  sentMessages = sentMessages.filter((message) => message.hash !== hash);

  if (sentMessages.length >= KEEPING_LIMIT) {
    sentMessages.shift();
  }

  sentMessages.push(new SentMessage(hash));

  await saveMessagesInLocalStorage();
}

export async function restoreMessagesFromStorage (): Promise<void> {
  sentMessages = await readMessagesFromLocalStorage();
  await saveMessagesInLocalStorage();
}
