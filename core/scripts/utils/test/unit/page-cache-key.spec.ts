import { generatePageCacheKey } from '../../page-cache-key';

describe('generatePageCacheKey', () => {
  it('ignores the cart recovery promo-code instruction', () => {
    const withoutInstruction = generatePageCacheKey(
      'petsies_store',
      'https://example.com/alerts/recover/cart/id/1/code/2'
    );
    const withInstruction = generatePageCacheKey(
      'petsies_store',
      'https://example.com/alerts/recover/cart/id/1/code/2?applyPromoCode=true'
    );

    expect(withInstruction).toBe(withoutInstruction);
  });

  it('keeps unrelated query parameters significant', () => {
    const firstPage = generatePageCacheKey(
      'petsies_store',
      'https://example.com/alerts/recover/cart/id/1/code/2?step=1&applyPromoCode=true'
    );
    const secondPage = generatePageCacheKey(
      'petsies_store',
      'https://example.com/alerts/recover/cart/id/1/code/2?step=2&applyPromoCode=false'
    );

    expect(firstPage).not.toBe(secondPage);
  });
});

describe('Page-key behavior is preserved', () => {
  it.each([
    ['?email=&email=alice%40example.test&step=2', '/page/?step=2', 'email=&email=alice%40example.test'],
    ['?%65mail=alice%40example.test&image-url=https%3A%2F%2Fexample.test%2Falice.png', '/page/', '%65mail=alice%40example.test&image-url=https%3A%2F%2Fexample.test%2Falice.png'],
    ['?step=a%26email%3Db&step=c+d&coupon_code=', '/page/?step=a%26email%3Db&step=c+d', 'coupon_code='],
    ['?step=2', '/page/?step=2', ''],
    ['?aleid=a%2Bb&alart=c%2Fd&step=2', '/page/?step=2', 'aleid=a%2Bb&alart=c%2Fd'],
    ['', '/page/', '']
  ])('splits %s once', (query, cleanUrl, strippedQuery) => {
    const { splitPageCacheUrl } = require('../../page-cache-key');
    const result = splitPageCacheUrl(new URL('https://example.test/page/' + query));
    expect(result).toEqual({ cleanUrl, strippedQuery });
    expect(generatePageCacheKey('synthetic', 'https://example.test/page/' + query)).toBe('page:synthetic:' + cleanUrl);
  });
});

describe('Stripped query is appended to redirect locations', () => {
  it.each([
    ['/giftcards/', 'email=bob%40example.test&utm_source=fb', '/giftcards/?email=bob%40example.test&utm_source=fb'],
    ['/target/?step=2', 'coupon_code=BOB20', '/target/?step=2&coupon_code=BOB20'],
    ['/sign-in/?redirect-target=%2Faccount%2F', 'redirect-target=%2Fother%2F&email=bob%40example.test', '/sign-in/?redirect-target=%2Faccount%2F&email=bob%40example.test'],
    ['/target/?step=2#reviews', 'utm_source=fb', '/target/?step=2&utm_source=fb#reviews'],
    ['/target/?aleid=owned#reviews', 'aleid=other&alart=a%2Bb', '/target/?aleid=owned&alart=a%2Bb#reviews'],
    ['https://example.test/target/', 'gclid=synthetic', 'https://example.test/target/?gclid=synthetic'],
    ['/target/?step=2', '', '/target/?step=2']
  ])('%s + %s', (location, strippedQuery, expected) => {
    const { appendStrippedQuery } = require('../../page-cache-key');
    expect(appendStrippedQuery(location, strippedQuery)).toBe(expected);
  });
});

it('keeps store, functional and mixed-case query dimensions significant', () => {
  const base = generatePageCacheKey('petsies_store', 'https://example.test/page/?step=1');
  expect(generatePageCacheKey('petsies_store', 'https://example.test/page/?step=1&aleid=one')).toBe(base);
  expect(generatePageCacheKey('petsies_store', 'https://example.test/page/?step=2&aleid=one')).not.toBe(base);
  expect(generatePageCacheKey('other_store', 'https://example.test/page/?step=1&alart=two')).not.toBe(base);
  expect(generatePageCacheKey('petsies_store', 'https://example.test/page/?step=1&ALEID=one')).not.toBe(base);
});
