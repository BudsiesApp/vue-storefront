import { getCustomerEmailHashes } from '../../helpers/get-customer-email-hashes.function';

describe('customer email hashes', () => {
  it('hashes a known email with SHA-256 and SHA3-256', () => {
    expect(getCustomerEmailHashes('buyer@example.com')).toEqual({
      customerEmailHashed: '6a6c26195c3682faa816966af789717c3bfa834eee6c599d667d2b3429c27cfd',
      customerEmailHashedSha3: 'd4b9c0cb38c01dfbde5eedb8053b34ca3e180b4a0646a168b39e899474c00887'
    });
  });

  it('normalizes case and surrounding whitespace only for the SHA-256 digest', () => {
    const hashes = getCustomerEmailHashes(' Buyer@Example.COM ');

    expect(hashes.customerEmailHashed).toBe(getCustomerEmailHashes('buyer@example.com').customerEmailHashed);
    expect(hashes.customerEmailHashedSha3).not.toBe(getCustomerEmailHashes('buyer@example.com').customerEmailHashedSha3);
  });

  it.each(['', '   ', undefined, null])('clears both digests for the blank email %p', (email) => {
    const hashes = getCustomerEmailHashes(email);

    expect(hashes).toHaveProperty('customerEmailHashed', undefined);
    expect(hashes).toHaveProperty('customerEmailHashedSha3', undefined);
  });
});
