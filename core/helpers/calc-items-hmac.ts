import { sha3_224 } from 'js-sha3'
import omit from 'lodash-es/omit'

import { productFieldsAllowedToUpdate } from '@vue-storefront/core/modules/cart/helpers/update-client-item-product-data.function'

const asyncLoadedItemFields = [
  'stock',
  'totals',
  ...productFieldsAllowedToUpdate.filter((field) => field !== 'sku')
]

export function calcItemsHmac (items = [], token) {
  return sha3_224(JSON.stringify({
    items: items.map((item) => omit(item, asyncLoadedItemFields)),
    token
  }))
}
