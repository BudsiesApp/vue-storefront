import { TaskQueue } from '@vue-storefront/core/lib/sync';

import { actions } from '../../store/actions';

jest.mock('config', () => ({ urlRewrite: { endpoint: 'http://api/ext/url-rewrite' } }));
jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: { execute: jest.fn() } }));
jest.mock('@vue-storefront/core/helpers', () => ({ processURLAddress: (url: string) => url }));

const execute = TaskQueue.execute as jest.Mock;
const loadUrlRewrite = actions.loadUrlRewrite as any;

describe('loadUrlRewrite', () => {
  beforeEach(() => {
    execute.mockReset();
  });

  it('maps a 200 response', async () => {
    execute.mockResolvedValue({ code: 200, result: { target_path: '/new/', rewrite_options: 'RP' } });

    const result = await loadUrlRewrite({ state: { urlRewrite: {} } }, { requestPath: 'old' });

    expect(result).toEqual({ targetPath: 'new', redirectCode: 301 });
  });

  it('treats 404 as no rewrite', async () => {
    execute.mockResolvedValue({ code: 404, result: 'Not Found' });

    await expect(loadUrlRewrite({ state: { urlRewrite: {} } }, { requestPath: 'old' })).resolves.toBeNull();
  });

  it.each([400, 500])('throws on code %i', async (code) => {
    execute.mockResolvedValue({ code, result: 'error' });

    await expect(loadUrlRewrite({ state: { urlRewrite: {} } }, { requestPath: 'old' })).rejects.toThrow();
  });

  it('propagates transport failures', async () => {
    execute.mockRejectedValue(new Error('network'));

    await expect(loadUrlRewrite({ state: { urlRewrite: {} } }, { requestPath: 'old' })).rejects.toThrow('network');
  });
});
