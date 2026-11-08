import cloneDeep from 'lodash-es/cloneDeep'

type Data = Record<string, any>
type Context = 'product' | 'customization' | 'optionData' | 'bundleOption' | 'link' | 'other'

const collections: Partial<Record<Context, Record<string, { key: string, item: Context }>>> = {
  product: {
    customizations: { key: 'id', item: 'customization' },
    bundle_options: { key: 'option_id', item: 'bundleOption' },
    configurable_children: { key: 'sku', item: 'product' }
  },
  optionData: { values: { key: 'id', item: 'other' } },
  bundleOption: { product_links: { key: 'sku', item: 'link' } }
}

function mergeObject (existing: Data, incoming: Data, context: Context): Data {
  const result = cloneDeep(existing)
  Object.keys(incoming).forEach(key => {
    const value = incoming[key]
    const collection = collections[context]?.[key]
    if (Array.isArray(value)) {
      result[key] = collection
        ? value.map(item => {
          const previous = (existing[key] || []).find(old => old[collection.key] === item[collection.key])
          return mergeObject(previous || {}, item, collection.item)
        })
        : cloneDeep(value)
    } else if (value !== null && typeof value === 'object') {
      const childContext: Context = context === 'customization' && key === 'optionData'
        ? 'optionData'
        : context === 'link' && key === 'product' ? 'product' : 'other'
      result[key] = mergeObject(existing[key] || {}, value, childContext)
    } else {
      result[key] = value
    }
  })
  return result
}

export function mergeProductData (existing: Data, incoming: Data): Data {
  return mergeObject(existing, incoming, 'product')
}
