import type { DiffLog } from 'core/modules/cart/helpers/createDiffLog';

// `addItems` reports a local rejection (out of stock, failed validation) only as an error notification,
// and a rejection by the server as a failed server response. A stock warning still means the item was added.
export function isAddToCartRejected (diffLog: DiffLog | undefined): boolean {
  if (!diffLog) {
    return false;
  }

  const hasFailedServerResponse = diffLog.serverResponses?.some((response) => String(response.status) !== '200');
  const hasErrorNotification = diffLog.clientNotifications?.some((notification) => notification.type === 'error');

  return !!hasFailedServerResponse || !!hasErrorNotification;
}
