import { getOptionValuePrice } from '../../helpers/get-option-value-price';

describe('option value price fallback', () => {
  it('returns the option price or zero when a SKU or product is absent', () => {
    expect(getOptionValuePrice({ id: 'plain', price: 12 } as any, {}, {})).toEqual({ regular: 12, special: null });
    expect(getOptionValuePrice({ id: 'missing', sku: 'missing' } as any, {}, {})).toEqual({ regular: 0, special: null });
  });

  it('returns the configured product price or the option fallback when regular price is zero', () => {
    const value = { id: 'rush', sku: 'rush', price: 8 } as any;
    const products = { rush: { id: 3 } } as any;
    expect(getOptionValuePrice(value, products, { 3: { regular: 25, special: 20 } })).toEqual({ regular: 25, special: 20 });
    expect(getOptionValuePrice(value, products, { 3: { regular: 0, special: null } })).toEqual({ regular: 8, special: null });
    expect(() => getOptionValuePrice(value, products, {})).toThrow();
  });
});
