import { quickSearchByQuery } from '@vue-storefront/core/lib/search'
import { getSearchAdapter } from '@vue-storefront/core/lib/search/adapter/searchAdapterFactory'

jest.mock('@vue-storefront/core/lib/search/adapter/searchAdapterFactory', () => ({
  getSearchAdapter: jest.fn()
}))
jest.mock('@vue-storefront/core/lib/multistore', () => ({
  currentStoreView: jest.fn(() => ({ storeCode: 'default' }))
}))
jest.mock('@vue-storefront/core/store', () => ({
  state: { user: {} }
}))
jest.mock('@vue-storefront/core/helpers', () => ({
  isServer: false
}))
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({
  StorageManager: {
    get: () => ({
      getItem: jest.fn(async () => null),
      setItem: jest.fn(async () => undefined)
    })
  }
}))
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: {
    debug: jest.fn(() => () => {}),
    error: jest.fn(() => () => {})
  }
}))
jest.mock('config', () => ({
  elasticsearch: { disablePersistentQueriesCache: true }
}))

interface Deferred {
  promise: Promise<any>,
  resolve: (value: any) => void,
  reject: (error: any) => void
}

function createDeferred (): Deferred {
  let resolvePromise: Deferred['resolve']
  let rejectPromise: Deferred['reject']
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return { promise, resolve: resolvePromise, reject: rejectPromise }
}

describe('quickSearchByQuery in-flight request coalescing', () => {
  let pendingSearches: Deferred[]
  let searchAdapter

  beforeEach(() => {
    pendingSearches = []
    searchAdapter = {
      search: jest.fn(() => {
        const deferred = createDeferred()
        pendingSearches.push(deferred)
        return deferred.promise
      }),
      entities: {
        product: {
          resultProcessor: jest.fn((resp) => ({ items: resp.items, total: resp.items.length }))
        }
      }
    }
    ;(getSearchAdapter as jest.Mock).mockResolvedValue(searchAdapter)
  })

  async function waitForSearches (count: number): Promise<void> {
    for (let attempt = 0; attempt < 50 && pendingSearches.length < count; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  it('sends one backend request for concurrent identical searches and isolates results', async () => {
    const first = quickSearchByQuery({ query: { sku: 'ForeversDog_bundle' }, size: 1 })
    const second = quickSearchByQuery({ query: { sku: 'ForeversDog_bundle' }, size: 1 })

    await waitForSearches(1)
    await new Promise((resolve) => setTimeout(resolve, 0))
    pendingSearches[0].resolve({ items: [{ sku: 'ForeversDog_bundle', name: 'Forevers' }] })

    const [firstResult, secondResult] = await Promise.all([first, second])

    expect(searchAdapter.search).toHaveBeenCalledTimes(1)
    expect(firstResult.items).toEqual(secondResult.items)
    expect(firstResult.items[0]).not.toBe(secondResult.items[0])

    firstResult.items[0].name = 'Changed'
    expect(secondResult.items[0].name).toBe('Forevers')
  })

  it('does not coalesce searches with different field projections', async () => {
    const full = quickSearchByQuery({ query: { sku: 'sku-1' }, excludeFields: [] })
    const projected = quickSearchByQuery({ query: { sku: 'sku-1' }, excludeFields: ['customizations'] })

    await waitForSearches(2)
    pendingSearches.forEach((search) => search.resolve({ items: [{ sku: 'sku-1' }] }))
    await Promise.all([full, projected])

    expect(searchAdapter.search).toHaveBeenCalledTimes(2)
  })

  it('sends a new request after a failed shared request', async () => {
    const first = quickSearchByQuery({ query: { sku: 'sku-2' } })
    const second = quickSearchByQuery({ query: { sku: 'sku-2' } })

    await waitForSearches(1)
    await new Promise((resolve) => setTimeout(resolve, 0))
    pendingSearches[0].reject(new Error('Network error'))

    const results = await Promise.all([first, second])

    expect(searchAdapter.search).toHaveBeenCalledTimes(1)
    results.forEach((result) => expect(result.offline).toBe(true))

    const retry = quickSearchByQuery({ query: { sku: 'sku-2' } })
    await waitForSearches(2)
    pendingSearches[1].resolve({ items: [{ sku: 'sku-2' }] })

    expect((await retry).items).toEqual([{ sku: 'sku-2' }])
    expect(searchAdapter.search).toHaveBeenCalledTimes(2)
  })
})
