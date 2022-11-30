/* eslint-disable valid-typeof */

import BulkorderQuoteApiResponse from './bulkorder-quote-api-response.interface';

export default function isBulkorderQuoteApiResponse (
  arg: unknown
): arg is BulkorderQuoteApiResponse {
  if (typeof arg !== 'object') {
    return false;
  }

  const tmpArg = arg as Record<string | number | symbol, unknown>;

  const fields: Record<string, string[]> = {
    'id': ['number'],
    'bulkorder_id': ['number'],
    'qty': ['number'],
    'production_price': ['number'],
    'shipping_price': ['number']
  }

  for (const field in fields) {
    if (!(field in tmpArg) || !fields[field].includes(typeof tmpArg[field])) {
      return false;
    }
  }

  return true;
}
