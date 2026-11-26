import { getDaysInMonth } from '../../../helpers/get-days-in-month.function';

describe('getDaysInMonth', () => {
  it.each([31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].map((days, index) => [index + 1, days]))(
    'returns the number of days for month %i',
    (month, days) => expect(getDaysInMonth(month)).toBe(days)
  );
});
