import { ProductService } from '@vue-storefront/core/data-resolver/ProductService'
import { quickSearchByQuery } from '@vue-storefront/core/lib/search'

jest.mock('@vue-storefront/core/lib/search', () => ({
  quickSearchByQuery: jest.fn(),
  isOnline: jest.fn(() => true)
}))
jest.mock('@vue-storefront/core/modules/catalog/helpers/search', () => ({
  getOptimizedFields: jest.fn(() => ({ excluded: null, included: null })),
  canCache: jest.fn(() => false),
  storeProductToCache: jest.fn()
}))
jest.mock('@vue-storefront/core/modules/catalog/helpers', () => ({
  doPlatformPricesSync: jest.fn()
}))
jest.mock('@vue-storefront/core/modules/catalog/helpers/prepare', () => ({
  prepareProducts: jest.fn((products) => products)
}))
jest.mock('@vue-storefront/core/modules/catalog/helpers/configure', () => ({
  configureProducts: jest.fn(async ({ products }) => products)
}))
jest.mock('@vue-storefront/core/helpers', () => ({
  isServer: false
}))
jest.mock('@vue-storefront/core/helpers/getApiEndpointUrl', () => jest.fn())
jest.mock('@vue-storefront/core/lib/multistore', () => ({
  currentStoreView: jest.fn(() => ({}))
}))
jest.mock('@vue-storefront/core/lib/sync', () => ({
  TaskQueue: {}
}))
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({
  StorageManager: {
    get: () => ({
      getItem: jest.fn(async () => null)
    })
  }
}))
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: {
    error: jest.fn(() => () => {})
  }
}))
jest.mock('config', () => ({
  cart: {},
  products: {}
}))

describe('ProductService.getProductByKey', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(quickSearchByQuery as jest.Mock).mockImplementation(async () => ({ items: [{ id: 73, sku: 'ForeversDog_bundle' }] }))
  })

  it.each([
    ['id', '73'],
    ['sku', 'ForeversDog_bundle']
  ])('searches by %s with the in operator', async (key, value) => {
    const product = await ProductService.getProductByKey({ options: { [key]: value }, key, skipCache: true })

    const { query, size, start } = (quickSearchByQuery as jest.Mock).mock.calls[0][0]

    expect(query.getAppliedFilters()).toEqual([
      expect.objectContaining({ attribute: key, value: { in: [value] }, scope: 'default' })
    ])
    expect(size).toBe(1)
    expect(start).toBe(0)
    expect(product).toEqual({ id: 73, sku: 'ForeversDog_bundle' })
  })
})
