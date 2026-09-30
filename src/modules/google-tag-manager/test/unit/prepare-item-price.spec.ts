import { prepareProductPrice } from '../../helpers/prepare-item-price.function';

describe('GA4 item price', () => {
  it('uses tax-exclusive product unit prices and numeric discounts', () => {
    const product = { qty: 1, price: 10, price_incl_tax: 12 };

    expect(prepareProductPrice(product, { regular: 12, special: 9.6 })).toEqual({
      price: 8,
      discount: 2
    });
  });

  it('keeps free product prices finite', () => {
    const freeProduct = { price: 0, price_incl_tax: 0 };

    expect(prepareProductPrice(freeProduct, { regular: 0, special: null })).toEqual({
      price: 0,
      discount: 0
    });
  });
});
