import { forStoryblok } from '../../mappingFallback';

jest.mock('@vue-storefront/core/lib/multistore', () => ({ removeStoreCodeFromRoute: (value: string) => value }));
jest.mock('@vue-storefront/core/lib/storeCodeFromRoute', () => ({ __esModule: true, default: () => null }));
jest.mock('config', () => ({ storyblok: { settings: {} }, storeViews: { multistore: false } }));

describe('Storyblok mapping fallback', () => {
  const dispatch = jest.fn();
  const context = { dispatch, rootState: { storyblok: {} } };

  beforeEach(() => dispatch.mockReset());

  it('records an existing lowercase story immediately when given a callback', async () => {
    dispatch.mockResolvedValue(true);
    const redirect = jest.fn();
    expect(await forStoryblok(context, { url: '/My-Story/', params: {}, redirect })).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith('/my-story/', 301);
  });

  it('does nothing for a lowercase match without a callback or for a missing story', async () => {
    dispatch.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const redirect = jest.fn();
    expect(await forStoryblok(context, { url: '/My-Story/', params: {} })).toBeUndefined();
    expect(await forStoryblok(context, { url: '/My-Story/', params: {}, redirect })).toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([['page', { name: 'storyblok-page' }], ['block', { name: 'storyblok-block', meta: { layout: 'empty' } }]])('retains editor %s routes', async (type, result) => {
    expect(await forStoryblok(context, { url: '/anything', params: { _storyblok_c: type } })).toEqual(result);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('returns ordinary lowercase stories', async () => {
    dispatch.mockResolvedValue({ full_slug: 'my-story' });
    expect(await forStoryblok(context, { url: '/my-story/', params: {} })).toEqual({
      name: 'storyblok-page', path: '/my-story/', params: { slug: 'my-story' }
    });
  });
});
