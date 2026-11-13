import { isCredentialQueryName, withoutCredentialQuery } from '@vue-storefront/core/helpers/credential-query';
import { TouchData, TrafficAttributionData } from '../types/traffic-attribution.interface';

export function sanitizeAttribution (attribution: TrafficAttributionData): TrafficAttributionData {
  const queryParams = {};
  Object.keys(attribution.query_params).forEach(key => {
    if (!isCredentialQueryName(key)) queryParams[key] = attribution.query_params[key];
  });
  return {
    ...attribution,
    landing_page_url: withoutCredentialQuery(attribution.landing_page_url),
    ...(attribution.referrer_url !== undefined ? { referrer_url: withoutCredentialQuery(attribution.referrer_url) } : {}),
    query_params: queryParams
  };
}

export function sanitizeTouch (touch: TouchData): TouchData {
  return { ...touch, attribution: sanitizeAttribution(touch.attribution) };
}
