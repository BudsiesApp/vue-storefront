const ignoredQueryKeys = [
  'srsltid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  '_kx',
  'fbclid',
  'utm_term',
  'utm_content',
  'utm_id',
  'gad_source',
  'gclid',
  'id',
  'gbraid',
  'dclid',
  'campaign',
  'data',
  'content',
  'msclkid',
  'uri',
  'url',
  'dest',
  'redirect',
  'file',
  'target',
  'mc_cid',
  'mc_eid',
  'sscid',
  'gad_campaignid',
  'gQT',
  'wbraid',
  'ttclid',
  'li_fat_id',
  'twclid',
  'sccid',
  'rdt_cid',
  'irclickid',
  'awc',
  'aleid',
  'alart',
  'm-message-click-id',
  'pp',
  'audience',
  'ref',
  'continueFlag',
  'hc_location',
  'qty',
  'email',
  'epik',
  'user',
  'SID',
  'referral_code',
  'newsletter-subscription-form-email-input',
  'redirect-target',
  'coupon_code',
  'applyPromoCode',
  'image-url',
  'order_item_id'
];

const ignoredQueryKeySet = new Set(ignoredQueryKeys);

export interface PageCacheUrl {
  /** Path and query without ignored parameters: the page cache key and the SSR render URL. */
  cleanUrl: string;
  /** The request's ignored query pairs, in their original encoding, joined with `&`. */
  strippedQuery: string;
}

function isIgnoredQueryPair (pair: string): boolean {
  const name = new URLSearchParams(pair).keys().next().value;

  return name !== undefined && ignoredQueryKeySet.has(name);
}

function getQueryPairs (search: string): string[] {
  return search.replace(/^\?/, '').split('&').filter(Boolean);
}

export function splitPageCacheUrl (url: URL): PageCacheUrl {
  const cleanUrl = new URL(url.href);

  ignoredQueryKeys.forEach((key) => cleanUrl.searchParams.delete(key));

  return {
    cleanUrl: `${cleanUrl.pathname}${cleanUrl.search}`,
    strippedQuery: getQueryPairs(url.search).filter(isIgnoredQueryPair).join('&')
  };
}

export function buildPageCacheKey (site: string, cleanUrl: string): string {
  return `page:${site}:${cleanUrl}`;
}

export function generatePageCacheKey (site: string, requestUrl: string): string {
  return buildPageCacheKey(site, splitPageCacheUrl(new URL(requestUrl)).cleanUrl);
}

/**
 * Appends the current request's ignored query pairs to a redirect location.
 * Keys the location already contains are kept as they are; a fragment stays last.
 */
export function appendStrippedQuery (location: string, strippedQuery: string): string {
  if (!strippedQuery) {
    return location;
  }

  const hashIndex = location.indexOf('#');
  const hash = hashIndex >= 0 ? location.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? location.slice(0, hashIndex) : location;
  const queryIndex = withoutHash.indexOf('?');
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const locationPairs = getQueryPairs(queryIndex >= 0 ? withoutHash.slice(queryIndex) : '');
  const locationKeys = new URLSearchParams(locationPairs.join('&'));
  const appendedPairs = getQueryPairs(strippedQuery).filter((pair) => {
    return !locationKeys.has(new URLSearchParams(pair).keys().next().value);
  });

  if (!appendedPairs.length) {
    return location;
  }

  return `${path}?${[...locationPairs, ...appendedPairs].join('&')}${hash}`;
}
