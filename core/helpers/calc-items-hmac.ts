import { sha3_224 } from 'js-sha3'
import isEmpty from 'lodash-es/isEmpty'
import omit from 'lodash-es/omit'

import { productFieldsAllowedToUpdate } from '@vue-storefront/core/modules/cart/helpers/update-client-item-product-data.function'

const asyncLoadedItemFields = [
  'stock',
  'totals',
  ...productFieldsAllowedToUpdate.filter((field) => field !== 'sku')
]

// Written by every totals refresh, so they must not make the stored hash stale.
const asyncLoadedExtensionAttributes = ['budsies_quote_item_totals']

function getHashableItem (item) {
  const hashableItem = omit(item, asyncLoadedItemFields)

  if (!hashableItem.extension_attributes) {
    return hashableItem
  }

  const extensionAttributes = omit(hashableItem.extension_attributes, asyncLoadedExtensionAttributes)

  if (isEmpty(extensionAttributes)) {
    return omit(hashableItem, 'extension_attributes')
  }

  return { ...hashableItem, extension_attributes: extensionAttributes }
}

export function calcItemsHmac (items = [], token) {
  return sha3_224(JSON.stringify({
    items: items.map(getHashableItem),
    token
  }))
}
