import { TaskQueue } from '@vue-storefront/core/lib/sync';

import { actions } from '../../../store/actions';

jest.mock('config', () => ({ storyblok: { endpoint: 'http://api/ext/storyblok' } }));
jest.mock('@vue-storefront/core/lib/sync', () => ({ TaskQueue: { execute: jest.fn() } }));
jest.mock('@vue-storefront/core/helpers', () => ({ processURLAddress: (url: string) => url }));
jest.mock('storyblok-js-client', () => jest.fn());

const execute = TaskQueue.execute as jest.Mock;
const loadStory = actions.loadStory as any;
const checkStoryExist = actions.checkStoryExist as any;

describe('Storyblok lookup actions', () => {
  beforeEach(() => {
    execute.mockReset();
  });

  it('returns a found story and the missing-story sentinel', async () => {
    const commit = jest.fn();
    execute.mockResolvedValueOnce({ code: 200, result: { full_slug: 'a' } });
    await expect(loadStory({ commit, state: { stories: {} } }, { fullSlug: 'a' })).resolves.toEqual({ full_slug: 'a' });

    execute.mockResolvedValueOnce({ code: 200, result: { story: false } });
    await expect(loadStory({ commit, state: { stories: {} } }, { fullSlug: 'b' })).resolves.toEqual({ story: false });
  });

  it('rejects a failed story lookup, removes the entry and recovers on retry', async () => {
    const commit = jest.fn();
    execute.mockResolvedValueOnce({ code: 500, result: 'Storyblok lookup error' });

    await expect(loadStory({ commit, state: { stories: {} } }, { fullSlug: 'a' })).rejects.toThrow();
    expect(commit).toHaveBeenCalledWith('removeStory', 'a');

    execute.mockResolvedValueOnce({ code: 200, result: { full_slug: 'a' } });
    await expect(loadStory({ commit, state: { stories: {} } }, { fullSlug: 'a' })).resolves.toEqual({ full_slug: 'a' });
  });

  it('rejects on transport failure', async () => {
    execute.mockRejectedValue(new Error('network'));

    await expect(loadStory({ commit: jest.fn(), state: { stories: {} } }, { fullSlug: 'a' })).rejects.toThrow();
  });

  it('returns the existence flag and rejects on a failed lookup', async () => {
    execute.mockResolvedValueOnce({ code: 200, result: { exist: true } });
    await expect(checkStoryExist({}, { fullSlug: 'a' })).resolves.toBe(true);

    execute.mockResolvedValueOnce({ code: 200, result: { exist: false } });
    await expect(checkStoryExist({}, { fullSlug: 'a' })).resolves.toBe(false);

    execute.mockResolvedValueOnce({ code: 500, result: 'error' });
    await expect(checkStoryExist({}, { fullSlug: 'a' })).rejects.toThrow();

    execute.mockRejectedValueOnce(new Error('network'));
    await expect(checkStoryExist({}, { fullSlug: 'a' })).rejects.toThrow('network');
  });
});
