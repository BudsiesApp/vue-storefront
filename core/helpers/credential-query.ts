export function isCredentialQueryName (name: string): boolean {
  const normalized = name.toLowerCase().replace(/[-_]/g, '');
  return normalized === 'password' || normalized === 'directcrmticket';
}

function isCredentialQueryPair (pair: string): boolean {
  const name = new URLSearchParams(pair).keys().next().value;
  return name !== undefined && isCredentialQueryName(name);
}

function filterPairs (query: string): string {
  return query.split('&').filter(pair => !isCredentialQueryPair(pair)).join('&');
}

export function withoutCredentialQuery (url: string): string {
  const queryIndex = url.indexOf('?');
  let result = url;
  if (queryIndex >= 0) {
    const query = url.slice(queryIndex + 1);
    const filtered = filterPairs(query);
    if (filtered !== query) result = url.slice(0, queryIndex) + (filtered ? '?' + filtered : '');
  }
  return result;
}
