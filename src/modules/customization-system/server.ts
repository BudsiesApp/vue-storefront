import { registerOutputCacheVariation } from '@vue-storefront/core/scripts/utils/output-cache-variations';
import { DETECTED_COUNTRY_COOKIE_KEY } from '../shared/types/detected-country-cookie.key';
import { resolveDeliveryCountryBucket } from './helpers/resolve-delivery-country-bucket';

registerOutputCacheVariation(DETECTED_COUNTRY_COOKIE_KEY, {
  tag: 'detected_country',
  resolve: resolveDeliveryCountryBucket
});
