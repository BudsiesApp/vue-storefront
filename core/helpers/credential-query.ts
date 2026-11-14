export function isCredentialQueryName (name: string): boolean {
  const normalized = name.toLowerCase().replace(/[-_]/g, '');
  return normalized === 'password' || normalized === 'directcrmticket';
}

export function isCredentialQueryPair (pair: string): boolean {
  const name = new URLSearchParams(pair).keys().next().value;
  return name !== undefined && isCredentialQueryName(name);
}

function filterPairs (query: string): string {
  return query.split('&').filter(pair => !isCredentialQueryPair(pair)).join('&');
}

export function withoutCredentialQuery (url: string): string {
  const hash = url.indexOf('#');
  const beforeHash = hash < 0 ? url : url.slice(0, hash);
  const fragment = hash < 0 ? '' : url.slice(hash);
  const queryIndex = beforeHash.indexOf('?');
  let result = beforeHash;
  if (queryIndex >= 0) {
    const query = beforeHash.slice(queryIndex + 1);
    const filtered = filterPairs(query);
    if (filtered !== query) result = beforeHash.slice(0, queryIndex) + (filtered ? '?' + filtered : '');
  }
  return result + fragment;
}
