import factory from '../../factories/rush-addon.factory';

describe('rush addon destination metadata', () => {
  it.each([
    [undefined, undefined],
    [false, false],
    [0, false],
    [true, true],
    [1, true]
  ])('preserves %s as %s', (isDomestic, expected) => {
    const addon = factory({
      sku: 'rush', text: 'Rush', price: 15, turnaround_time: 7,
      is_domestic: isDomestic, slots_left: 0, is_in_time_for_christmas: true
    });

    expect(addon).toMatchObject({
      id: 'rush', text: 'Rush', price: 15, turnaroundTime: 7,
      slotsLeft: 0, isDomestic: expected, isInTimeForChristmas: true
    });
  });
});
