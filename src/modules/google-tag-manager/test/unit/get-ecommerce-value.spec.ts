import { getEcommerceValue } from '../../helpers/get-ecommerce-value.function';

describe('GA4 ecommerce value', () => {
  it('sums discounted item revenue at the end so fractional unit prices reconcile', () => {
    expect(getEcommerceValue([
      { price: 29 / 3, quantity: 3 },
      { price: 5, quantity: 2 }
    ])).toBe(39);
  });

  it('rounds the final USD value to two decimals', () => {
    expect(getEcommerceValue([{ price: 1.234, quantity: 1 }])).toBe(1.23);
    expect(getEcommerceValue([{ price: 10.235, quantity: 1 }])).toBe(10.24);
  });

  it('uses one unit for a product without an explicit quantity', () => {
    expect(getEcommerceValue([{ price: 8 }])).toBe(8);
  });
});
