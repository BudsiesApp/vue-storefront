import type { Store } from 'vuex';
import type RootState from '@vue-storefront/core/types/RootState';
import type Product from '@vue-storefront/core/modules/catalog/types/Product';
import { createSimpleProduct, createBundleProduct } from '@vue-storefront/core/modules/catalog/test/helpers/createProduct';
import { calculateProductTax } from '@vue-storefront/core/modules/catalog/helpers/taxCalc';
import { prepareProductPrice } from '../../helpers/prepare-item-price.function';
import { prepareProductItemData } from '../../helpers/prepare-product-item-data.function';
import { getEcommerceValue } from '../../helpers/get-ecommerce-value.function';

jest.mock('@vue-storefront/core/modules/catalog/helpers', () => ({
  isBundleProduct: (product: Product) => product.type_id === 'bundle'
}));
jest.mock('@vue-storefront/core/filters', () => ({ price: jest.fn() }));
jest.mock('@vue-storefront/core/lib/multistore', () => ({ currentStoreView: () => ({ name: 'Petsies' }) }));

function productWithTax (paid = 100, rate = 20): Product {
  const product = { ...createSimpleProduct(), price: 100, regular_price: 100, final_price: paid, special_price: paid < 100 ? paid : null };
  return calculateProductTax({
    product,
    taxClasses: [{ product_tax_class_ids: [2], rates: [{ tax_country_id: 'US', tax_region_id: 0, rate }] }],
    taxCountry: 'US',
    sourcePriceInclTax: false,
    finalPriceInclTax: false,
    isTaxWithUserGroupIsActive: false
  });
}

describe('GA4 catalog unit prices using real price resolvers', () => {
  it.each([0, 20])('reports net price and discount with %s percent tax', (rate) => {
    expect(prepareProductPrice(productWithTax(100, rate), {})).toEqual({ price: 100, discount: 0 });
    expect(prepareProductPrice(productWithTax(80, rate), {})).toEqual({ price: 80, discount: 20 });
  });

  it.each([1, 2, 3])('keeps unit amounts independent of quantity %s and cached getter prices', (qty) => {
    const product = { ...productWithTax(80), qty };
    const getter = jest.fn(() => ({ regular: 999, special: null }));
    const store = {
      state: { product: { productDiscountedPrice: {} } },
      getters: { 'product/getProductPrice': getter }
    } as unknown as Store<RootState>;
    const item = prepareProductItemData(product, store);
    expect(item).toMatchObject({ price: 80, discount: 20, quantity: qty });
    expect(getEcommerceValue([item])).toBe(80 * qty);
    expect(getter).not.toHaveBeenCalled();
  });

  it('does not depend on the presence of raw regular_price', () => {
    const product = productWithTax(100);
    delete product.regular_price;
    expect(prepareProductPrice(product, {})).toEqual({ price: 100, discount: 0 });
  });

  it.each([60, 0])('preserves a tax-inclusive campaign override of %s', (final) => {
    const product = productWithTax(80);
    expect(prepareProductPrice(product, { [product.id]: { regular: 120, final } })).toEqual({
      price: final / 1.2,
      discount: 100 - final / 1.2
    });
  });

  it('preserves default bundle option campaign pricing', () => {
    const child = productWithTax(80);
    const bundle = { ...createBundleProduct(), price: 80, price_incl_tax: 96, original_price: 100, original_price_incl_tax: 120 };
    bundle.bundle_options = [{ ...bundle.bundle_options[0], product_links: [{
      ...bundle.bundle_options[0].product_links[0], product: child, is_default: true
    }] }];
    expect(prepareProductPrice(bundle, { [child.id]: { regular: 120, final: 60 } })).toEqual({ price: 50, discount: 50 });
    expect(prepareProductPrice(bundle, {})).toEqual({ price: 80, discount: 20 });
  });

  it('retains configured gift-card amounts', () => {
    const product: Product = { ...createSimpleProduct(), price: 0, price_incl_tax: 0, original_price_incl_tax: 0,
      product_option: { extension_attributes: { am_giftcard_options: { am_giftcard_amount: 75 } } }
    };
    expect(prepareProductPrice(product, {})).toEqual({ price: 75, discount: 0 });
  });

  it('handles free products and missing original price', () => {
    expect(prepareProductPrice({ ...createSimpleProduct(), price: 0, price_incl_tax: 0 }, {})).toEqual({ price: 0, discount: 0 });
    expect(prepareProductPrice({ ...createSimpleProduct(), price: 25, price_incl_tax: 30 }, {})).toEqual({ price: 25, discount: 0 });
  });
});
