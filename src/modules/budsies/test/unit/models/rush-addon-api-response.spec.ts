import rushAddonFactory from '../../../factories/rush-addon.factory';

const validResponse = {
  sku: 'rush',
  text: 'Rush',
  price: 20,
  turnaround_time: 14,
  is_domestic: 1
};

describe('Rush add-on API response', () => {
  it('normalizes numeric is_domestic values to booleans', () => {
    expect(rushAddonFactory(validResponse).isDomestic).toBe(true);
    expect(rushAddonFactory({ ...validResponse, is_domestic: 0 }).isDomestic).toBe(false);
  });

  it('normalizes the Holiday promise boolean', () => {
    const response = { ...validResponse, is_in_time_for_christmas: true };

    expect(rushAddonFactory(response).isInTimeForChristmas).toBe(true);
    expect(rushAddonFactory({ ...response, is_in_time_for_christmas: false }).isInTimeForChristmas).toBe(false);
  });
});
