import fetch from '@vue-storefront/core/lib/fetch';
import { actions as urlActions } from '../../../store/actions';

jest.mock('@vue-storefront/core/helpers', () => ({ processURLAddress: (url: string) => url, isServer: false }));
jest.mock('@vue-storefront/core/lib/multistore', () => ({
  adjustMultistoreApiUrl: (url: string) => url,
  removeStoreCodeFromRoute: jest.fn()
}));
jest.mock('@vue-storefront/core/lib/storeCodeFromRoute', () => jest.fn(() => ''));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => () => {}) } }));
jest.mock('@vue-storefront/core/lib/fetch', () => jest.fn());
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({ $emit: jest.fn() }));
jest.mock('@vue-storefront/core/modules/catalog/helpers/search', () => ({}));
jest.mock('@vue-storefront/core/modules/catalog/helpers/prepare', () => ({}));
jest.mock('src/modules/shared', () => ({ BEFORE_STORE_BACKEND_API_REQUEST: 'before-request' }));
jest.mock('@vue-storefront/core/modules/url/index', () => ({}));
jest.mock('@vue-storefront/core/modules/recently-viewed/index', () => ({ cacheStorage: {} }));
jest.mock('@vue-storefront/core/modules/url/helpers', () => ({}));
jest.mock('@vue-storefront/core/modules/url/helpers/transformUrl', () => ({}));
jest.mock('config', () => ({
  urlModule: { map_endpoint: 'http://api/url/map' },
  cart: {},
  products: {}
}));

const run = () => (urlActions as any).getFallbackByUrl(
  { rootState: { user: {} } },
  { url: 'a', params: {} }
);

const mockFetch = fetch as unknown as jest.Mock;

describe('getFallbackByUrl action', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns the hit and a successful null miss', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ _type: 'category' }) });
    await expect(run()).resolves.toEqual({ _type: 'category' });

    mockFetch.mockResolvedValue({ ok: true, json: async () => null });
    await expect(run()).resolves.toBeNull();
  });

  it('rejects a non-OK response and a transport failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(run()).rejects.toThrow();

    mockFetch.mockRejectedValue(new Error('network'));
    await expect(run()).rejects.toThrow('network');
  });
});
