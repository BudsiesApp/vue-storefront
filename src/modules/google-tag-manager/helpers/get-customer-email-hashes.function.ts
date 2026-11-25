import { sha256 } from 'js-sha256';
import { sha3_256 } from 'js-sha3';

export interface CustomerEmailHashes {
  customerEmailHashed: string | undefined,
  customerEmailHashedSha3: string | undefined
}

export function getCustomerEmailHashes (email: string | null | undefined): CustomerEmailHashes {
  if (typeof email !== 'string' || !email.trim()) {
    return {
      customerEmailHashed: undefined,
      customerEmailHashedSha3: undefined
    };
  }

  return {
    customerEmailHashed: sha256(email.trim().toLowerCase()),
    customerEmailHashedSha3: sha3_256(email)
  };
}
