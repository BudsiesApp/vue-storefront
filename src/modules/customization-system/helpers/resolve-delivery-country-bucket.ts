export type DeliveryCountryBucket = 'US' | 'INTL';

export const DEFAULT_DELIVERY_COUNTRY = 'US';

export function resolveDeliveryCountryBucket (country?: string): DeliveryCountryBucket {
  return (country?.trim().toUpperCase() || DEFAULT_DELIVERY_COUNTRY) === 'US' ? 'US' : 'INTL';
}
