import { getApiErrorMessage } from '../../helpers/get-api-error-message';

describe('getApiErrorMessage', () => {
  it('returns a usable server message unchanged', () => {
    expect(getApiErrorMessage({ errorMessage: ' Address locked ' }, 'Fallback')).toBe(' Address locked ');
  });

  it.each([
    ['an object', { errorMessage: { code: 'ECONNREFUSED' } }],
    ['an empty string', { errorMessage: '' }],
    ['a whitespace-only string', { errorMessage: '  ' }],
    ['a missing message', {}],
    ['a string result', 'Unauthorized'],
    ['no result', undefined]
  ])('returns the fallback for %s', (_label, result) => {
    expect(getApiErrorMessage(result, 'Fallback')).toBe('Fallback');
  });
});
