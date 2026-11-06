import {
  add,
  components,
  loadStoryblokComponentGroup,
  StoryblokComponentGroup
} from '../../../components';

jest.mock('vue-lazy-hydration/src/utils/hydration-blocker', () => ({
  makeHydrationBlocker: (component, options) =>
    Object.assign(require('vue-lazy-hydration').hydrateWhenVisible(component), options)
}));

jest.mock('../../../helpers/is-storyblok-preview.function', () => ({
  isStoryblokPreview: () => false
}));

describe('component groups', () => {
  it('preserves the default layout entries and real hydration wrappers', () => {
    for (const componentKey of [
      'page',
      'debug',
      'tile',
      'page_section',
      'grid',
      'column',
      'block',
      'block_reference',
      'category_description',
      'product_description'
    ]) {
      expect(components[componentKey]).toBeDefined();
    }

    expect(typeof components.block).toBe('object');
  });

  it('waits for selected factories, skips wrappers and excludes other chunks', async () => {
    const defaults = Object.keys(components);
    const factories = defaults.filter(
      componentKey => typeof components[componentKey] === 'function'
    );

    factories.forEach(componentKey => {
      components[componentKey] = jest.fn().mockResolvedValue({});
    });

    let resolveDeferred!: () => void;
    const pending = jest.fn(
      () =>
        new Promise<void>(resolve => {
          resolveDeferred = resolve;
        })
    );
    const other = jest.fn().mockResolvedValue({});

    add('pending', pending, { group: StoryblokComponentGroup.CORE });
    add('other', other);

    let finished = false;
    const loading = loadStoryblokComponentGroup(StoryblokComponentGroup.CORE).then(() => {
      finished = true;
    });

    await Promise.resolve();

    expect(pending).toHaveBeenCalledTimes(1);

    factories.forEach(componentKey => expect(components[componentKey]).toHaveBeenCalledTimes(1));

    expect(other).not.toHaveBeenCalled();
    expect(finished).toBe(false);

    resolveDeferred();
    await loading;

    expect(finished).toBe(true);

    await loadStoryblokComponentGroup(StoryblokComponentGroup.DEFAULT);

    expect(other).toHaveBeenCalledTimes(1);

    delete components.pending;
    delete components.other;
  });

  it('includes every default root/layout registration in CORE', async () => {
    const keys = [
      'page',
      'debug',
      'tile',
      'page_section',
      'grid',
      'column',
      'block',
      'block_reference',
      'category_description',
      'product_description'
    ];
    const originals = keys.map(componentKey => components[componentKey]);

    try {
      keys.forEach(componentKey => {
        components[componentKey] = jest.fn().mockResolvedValue({});
      });
      await loadStoryblokComponentGroup(StoryblokComponentGroup.CORE);
      keys.forEach(componentKey => expect(components[componentKey]).toHaveBeenCalledTimes(1));
    } finally {
      keys.forEach((componentKey, index) => {
        components[componentKey] = originals[index];
      });
    }
  });

  it('keeps rejected duplicate membership and applies forced replacement options', async () => {
    const original = jest.fn().mockResolvedValue({});
    const replacement = jest.fn().mockResolvedValue({});

    add('replacement', original, { group: StoryblokComponentGroup.CORE });

    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    add('replacement', replacement);
    await loadStoryblokComponentGroup(StoryblokComponentGroup.CORE);

    expect(original).toHaveBeenCalledTimes(1);
    expect(replacement).not.toHaveBeenCalled();

    add('replacement', replacement, { force: true });
    await loadStoryblokComponentGroup(StoryblokComponentGroup.CORE);

    expect(original).toHaveBeenCalledTimes(1);

    await loadStoryblokComponentGroup(StoryblokComponentGroup.DEFAULT);

    expect(replacement).toHaveBeenCalledTimes(1);

    log.mockRestore();
  });
});
