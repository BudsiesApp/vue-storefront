import config from 'config';
import { isServer } from '@vue-storefront/core/helpers';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';

export const REPORT_ERROR = 'report-error';

export interface ReportedError {
  shortMessage: string,
  fullMessage: string,
  currentUrl: string,
  context: Record<string, string | number>
}

const endpoints = {
  'order-address-update': '/order/address/update-requests',
  'order-address-confirmation': '/order/address/confirmation-requests',
  'customer-address-create': '/address/create',
  'customer-address-update': '/address/update'
} as const;

type Operation = keyof typeof endpoints;

export interface AddressFailure {
  operation: Operation,
  message: string,
  status?: number | string,
  userId?: number,
  orderId?: number,
  addressId?: number
}

export function reportAddressApiFailure ({ operation, message, status, userId, orderId, addressId }: AddressFailure): void {
  const code = Number(status);

  if (status !== undefined && !(code >= 500 && code <= 599)) {
    return;
  }

  if (isServer || !config.errorLogging?.serviceUrl) {
    return;
  }

  const context: Record<string, string | number> = {
    operation,
    endpoint: endpoints[operation],
    status: 'none'
  };

  if (status !== undefined) {
    context.status = code;
  }

  if (userId !== undefined) {
    context.userId = userId;
  }

  if (orderId !== undefined) {
    context.orderId = orderId;
  }

  if (addressId !== undefined) {
    context.addressId = addressId;
  }

  const messageParts = [message, operation, String(context.status)];

  if (userId !== undefined) {
    messageParts.push(String(userId));
  }

  if (orderId !== undefined) {
    messageParts.push(String(orderId));
  }

  if (addressId !== undefined) {
    messageParts.push(String(addressId));
  }

  const report: ReportedError = {
    shortMessage: messageParts.join(' '),
    fullMessage: message,
    currentUrl: `${window.location.origin}${window.location.pathname}`,
    context
  };

  EventBus.$emit(REPORT_ERROR, report);
}
