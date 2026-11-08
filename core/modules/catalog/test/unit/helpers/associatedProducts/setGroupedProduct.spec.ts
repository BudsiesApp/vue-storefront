import { createBundleProduct, createGroupProduct, createSimpleProduct } from '../../../helpers/createProduct';
import setGroupedProduct from '@vue-storefront/core/modules/catalog/helpers/associatedProducts/setGroupedProduct';
import { ProductService } from '@vue-storefront/core/data-resolver/ProductService'

jest.mock('@vue-storefront/core/helpers', () => ({
  once: (str) => jest.fn()
}))
jest.mock('@vue-storefront/core/lib/multistore', () => ({
  currentStoreView: jest.fn(() => ({}))
}))
jest.mock('@vue-storefront/core/data-resolver', () => ({}))
jest.mock('@vue-storefront/i18n', () => ({ t: jest.fn(str => str) }));
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: {
    error: jest.fn(() => () => {})
  }
}));
jest.mock('@vue-storefront/core/store', () => ({}));
jest.mock('@vue-storefront/core/data-resolver/ProductService', () => ({
  ProductService: {
    getProducts: jest.fn(),
    getProductRenderList: jest.fn(),
    getProductByKey: jest.fn()
  }
}));

describe('setGroupedProduct helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(ProductService.getProducts as jest.Mock).mockImplementation(async () => ({ items: [] }));
  })
  it('should not fire ProductService.getProducts if it is not grouped product', async () => {
    const bundleProduct = createBundleProduct()

    setGroupedProduct(bundleProduct)

    expect(ProductService.getProducts).toHaveBeenCalledTimes(0)
  })
  it('should fire ProductService.getProducts with simple configuration', async () => {
    const groupedProduct = createGroupProduct()

    setGroupedProduct(groupedProduct)

    expect(ProductService.getProducts).toHaveBeenNthCalledWith(1, {
      query: expect.anything(),
      size: 3,
      excludeFields: null,
      includeFields: null,
      options: {
        prefetchGroupProducts: false,
        fallbackToDefaultWhenNoAvailable: false,
        setProductErrors: false,
        setConfigurableProductOptions: false,
        assignProductConfiguration: false,
        separateSelectedVariant: false
      }
    })
  })
  it('attaches every product when there are more than 50 links', async () => {
    const groupedProduct = createGroupProduct()
    const template = groupedProduct.product_links[0]
    const links = Array.from({ length: 51 }, (_, i) => ({ ...template, linked_product_sku: `sku-${i}` }))
    groupedProduct.product_links = links
    const items = links.map(link => ({ ...createSimpleProduct(), sku: link.linked_product_sku }))
    ;(ProductService.getProducts as jest.Mock).mockResolvedValue({ items })

    await setGroupedProduct(groupedProduct)

    expect(ProductService.getProducts).toHaveBeenCalledWith(expect.objectContaining({ size: 51 }))
    links.forEach((link, i) => expect(link.product.sku).toBe(items[i].sku))
  })
})
