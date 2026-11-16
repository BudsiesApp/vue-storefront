import productMutations from '@vue-storefront/core/modules/catalog/store/product/mutations'
import * as types from '@vue-storefront/core/modules/catalog/store/product/mutation-types'
import Vue from 'vue'
import { updateProductProductionTimeCustomizationData } from 'src/modules/customization-system/helpers/update-product-production-time-customization-data'
import { PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID } from 'src/modules/customization-system/types/production-time-selector-standard-option-value-id'

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

  it('replaces transformed Production Time membership with raw catalog values and rebuilds choices once', () => {
    const raw: any = { id: 73, sku: 'plushie', customizations: [{ id: 'time', optionData: { type: 'production_time_upgrade', values: [{ id: 'rush', sku: 'rush', name: 'Rush' }, { id: 'express', sku: 'express', name: 'Express' }] } }] }
    const store: any = { getters: { 'budsies/getProductRushAddons': () => [{ id: '', text: 'Standard' }, { id: 'rush', text: 'Rush' }, { id: 'express', text: 'Express' }] } }
    const transformed = updateProductProductionTimeCustomizationData(raw, store)
    productMutations[types.PRODUCT_SET_PRODUCT_BY_SKU](state, transformed)
    productMutations[types.PRODUCT_MERGE_PRODUCT_BY_SKU](state, raw)
    expect(state.productBySku.plushie.customizations[0].optionData.values.map(value => value.id)).toEqual(['rush', 'express'])
    const rebuilt = updateProductProductionTimeCustomizationData(state.productBySku.plushie, store)
    expect(rebuilt.customizations[0].optionData.values.map(value => value.id)).toEqual([PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID, 'rush', 'express'])
  })

  it('makes a merged entry reactive without modifying either input', async () => {
    const reactive = Vue.observable(state)
    const previous = reactive.productBySku.plushie
    const incoming = { sku: 'plushie', name: 'Updated' }
    const observed = jest.fn()
    const vm = new Vue({ computed: { name () { return reactive.productBySku.plushie.name } }, watch: { name: observed } })
    expect(vm.name).toBeUndefined()
    productMutations[types.PRODUCT_MERGE_PRODUCT_BY_SKU](reactive, incoming)
    await Vue.nextTick()
    expect(observed).toHaveBeenCalledWith('Updated', undefined)
    expect(reactive.productBySku.plushie).not.toBe(previous)
    expect(previous.name).toBeUndefined()
    expect(incoming).toEqual({ sku: 'plushie', name: 'Updated' })
    vm.$destroy()
  })
})
