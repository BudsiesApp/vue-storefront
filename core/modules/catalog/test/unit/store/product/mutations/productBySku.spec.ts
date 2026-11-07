import productMutations from '@vue-storefront/core/modules/catalog/store/product/mutations'
import * as types from '@vue-storefront/core/modules/catalog/store/product/mutation-types'

jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: {
    log: jest.fn(() => () => {}),
    error: jest.fn(() => () => {})
  }
}))

describe('product dictionary mutations', () => {
  let state

  beforeEach(() => {
    state = {
      productBySku: {
        plushie: {
          sku: 'plushie',
          price: 50,
          customizations: [{ id: 'size' }],
          stock: { is_in_stock: true, max_sale_qty: 5 },
          bundle_options: [{ option_id: 1, product_links: [{ sku: 'rush', product: { sku: 'rush' } }] }]
        }
      }
    }
  })

  it('replaces the entry on a set', () => {
    productMutations[types.PRODUCT_SET_PRODUCT_BY_SKU](state, { sku: 'plushie', price: 60 })

    expect(state.productBySku.plushie).toEqual({ sku: 'plushie', price: 60 })
  })

  it('stores a product without an existing entry on a merge', () => {
    const product = { sku: 'pillow', price: 30 }

    productMutations[types.PRODUCT_MERGE_PRODUCT_BY_SKU](state, product)

    expect(state.productBySku.pillow).toBe(product)
  })

  it('adds missing data and updates values without removing existing data on a merge', () => {
    const previousEntry = state.productBySku.plushie

    productMutations[types.PRODUCT_MERGE_PRODUCT_BY_SKU](state, {
      sku: 'plushie',
      price: 60,
      name: 'Plushie',
      stock: { is_in_stock: true },
      bundle_options: [{ option_id: 1, product_links: [{ sku: 'rush' }] }]
    })

    expect(state.productBySku.plushie).not.toBe(previousEntry)
    expect(state.productBySku.plushie).toEqual({
      sku: 'plushie',
      price: 60,
      name: 'Plushie',
      customizations: [{ id: 'size' }],
      stock: { is_in_stock: true, max_sale_qty: 5 },
      bundle_options: [{ option_id: 1, product_links: [{ sku: 'rush', product: { sku: 'rush' } }] }]
    })
    expect(previousEntry.price).toBe(50)
  })
})
