import Vue from 'vue';
import { Logger } from '@vue-storefront/core/lib/logger';
import { mount } from '@vue/test-utils';
import StoryblokMixin from '../../../components/StoryblokMixin';
import { loadStoryblokComponentGroup } from '../../../components';
import { emitPageRenderedEvent } from 'src/modules/shared';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { PAGE_RENDERED } from 'src/modules/shared/types/page-rendered.event';

jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: { error: jest.fn(() => jest.fn()) }
}));

jest.mock('src/modules/vsf-storyblok-module', () => ({ KEY: 'storyblok' }));
jest.mock('src/modules/shared', () => ({ emitPageRenderedEvent: jest.fn() }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/lib/multistore', () => ({ currentStoreView: () => ({}) }));
jest.mock('../../../components', () => ({
  loadStoryblokComponentGroup: jest.fn(),
  StoryblokComponentGroup: { CORE: 'core' }
}));
jest.mock('../../../helpers', () => ({
  getStoryblokQueryParams: route => ({ fullSlug: route.path.slice(1), ...route.query }),
  loadScript: jest.fn()
}));
jest.mock('../../../helpers/resolve-parent-data.function', () => ({
  resolveParentData: value => value
}));

const loader = loadStoryblokComponentGroup as jest.Mock;
async function flushRenderQueue (): Promise<void> {
  for (let turn = 0; turn < 10; turn++) {
    await Vue.nextTick();
  }
}

function deferred () {
  let resolveDeferred!: (value?: any) => void;
  let rejectDeferred!: (error: Error) => void;
  const promise = new Promise<any>((resolve, reject) => {
    resolveDeferred = resolve;
    rejectDeferred = reject;
  });

  return { promise, resolve: resolveDeferred, reject: rejectDeferred };
}

function harness (cached = false) {
  const route = Vue.observable({ path: '/A', query: {} });
  const state = Vue.observable({
    storyblok: { stories: cached ? { A: { story: { content: {} } } } : {} }
  });
  const requests: Record<string, ReturnType<typeof deferred>> = {};
  const dispatch = jest.fn((_, { fullSlug }) => {
    if (state.storyblok.stories[fullSlug]?.story) {
      return Promise.resolve(state.storyblok.stories[fullSlug].story);
    }

    return (requests[fullSlug] = deferred()).promise;
  });
  const Component = Vue.extend({
    mixins: [StoryblokMixin as any],
    props: { routeInput: { type: Object, required: true } },
    computed: {
      $route() {
        return this.routeInput;
      }
    },
    render: h => h('div')
  });
  const options = {
    propsData: { routeInput: route },
    mocks: {
      $store: {
        state,
        dispatch,
        _modulesNamespaceMap: { 'storyblok/': { context: { state: state.storyblok } } }
      }
    }
  };
  const wrapper = mount(Component, options);

  return { route, state, requests, dispatch, wrapper };
}

beforeEach(() => {
  jest.useFakeTimers();
  loader.mockReset().mockResolvedValue(undefined);
  (emitPageRenderedEvent as jest.Mock).mockReset();
});
afterEach(() => {
  jest.useRealTimers();
});

it.each([false, true])('waits for chunks and render turns on mount (cached: %s)', async cached => {
  const chunk = deferred();

  loader.mockReturnValue(chunk.promise);

  const storyHarness = harness(cached);

  if (!cached) {
    storyHarness.requests.A.resolve({ content: {} });
  }

  await flushRenderQueue();

  expect(emitPageRenderedEvent).not.toHaveBeenCalled();

  chunk.resolve();
  await flushRenderQueue();

  expect(emitPageRenderedEvent).not.toHaveBeenCalled();

  jest.runOnlyPendingTimers();
  await flushRenderQueue();

  expect(emitPageRenderedEvent).toHaveBeenCalledTimes(1);
  expect(storyHarness.dispatch).toHaveBeenCalledTimes(1);

  storyHarness.wrapper.destroy();
});

it.each([false, true])(
  'finalizes missing/failed requests without a chunk wait (failed: %s)',
  async failed => {
    const storyHarness = harness();

    if (failed) {
      storyHarness.requests.A.reject(new Error('request failed'));
    } else {
      storyHarness.requests.A.resolve(undefined);
    }

    await flushRenderQueue();

    expect(loader).not.toHaveBeenCalled();
    expect(emitPageRenderedEvent).toHaveBeenCalledTimes(1);

    if (failed) {
      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'storyblok');
    }

    storyHarness.wrapper.destroy();
  }
);

it.each(['request', 'chunk', 'timer'])(
  'binds reused routes and suppresses stale %s completions',
  async stage => {
    const chunk = deferred();

    loader.mockReturnValueOnce(chunk.promise).mockResolvedValue(undefined);

    const storyHarness = harness();

    if (stage !== 'request') {
      storyHarness.requests.A.resolve({ content: {} });
      await flushRenderQueue();

      if (stage === 'timer') {
        chunk.resolve();
        await flushRenderQueue();
      }
    }
    // Replace the route object, as Vue Router does, so the watcher receives the old path.

    await storyHarness.wrapper.setProps({ routeInput: { path: '/B', query: {} } });
    await flushRenderQueue();
    storyHarness.requests.B.resolve({ content: {} });

    if (stage === 'request') {
      storyHarness.requests.A.resolve({ content: {} });
    }

    chunk.resolve();
    await flushRenderQueue();
    jest.runOnlyPendingTimers();
    await flushRenderQueue();

    expect(storyHarness.dispatch).toHaveBeenLastCalledWith('storyblok/loadStory', { fullSlug: 'B' });
    expect(emitPageRenderedEvent).toHaveBeenCalledTimes(1);

    storyHarness.wrapper.destroy();
  }
);

it.each(['request', 'chunk', 'timer'])(
  'does not emit the page event after the page is destroyed during the %s wait',
  async stage => {
    const chunk = deferred();

    loader.mockReturnValueOnce(chunk.promise);

    const storyHarness = harness();

    if (stage !== 'request') {
      storyHarness.requests.A.resolve({ content: {} });
      await flushRenderQueue();
    }

    if (stage === 'timer') {
      chunk.resolve();
      await flushRenderQueue();
    }

    storyHarness.wrapper.destroy();

    storyHarness.requests.A.resolve({ content: {} });
    chunk.resolve();
    await flushRenderQueue();
    jest.runOnlyPendingTimers();
    await flushRenderQueue();

    expect(emitPageRenderedEvent).not.toHaveBeenCalled();
  }
);

it('emits the page event when the component chunk fails to load', async () => {
  loader.mockRejectedValueOnce(new Error('chunk failed'));

  const storyHarness = harness(true);

  await flushRenderQueue();
  jest.runOnlyPendingTimers();
  await flushRenderQueue();

  expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'storyblok');
  expect(emitPageRenderedEvent).toHaveBeenCalledTimes(1);

  storyHarness.wrapper.destroy();
});

it.each(['destroy', 'reuse'])(
  'cancels the final deferred event when the page is invalidated by %s',
  async invalidation => {
    const realEmitter = jest.requireActual('src/modules/shared/helpers/emit-page-rendered-event.function');
    const emitSpy = jest.spyOn(EventBus, '$emit');
    (emitPageRenderedEvent as jest.Mock).mockImplementation(realEmitter.emitPageRenderedEvent);

    const storyHarness = harness();
    storyHarness.requests.A.resolve(undefined);
    await flushRenderQueue();

    expect(emitPageRenderedEvent).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);

    if (invalidation === 'destroy') {
      storyHarness.wrapper.destroy();
    } else {
      await storyHarness.wrapper.setProps({ routeInput: { path: '/B', query: {} } });
      await flushRenderQueue();
    }

    jest.runOnlyPendingTimers();
    await flushRenderQueue();
    expect(emitSpy).not.toHaveBeenCalledWith(PAGE_RENDERED);

    if (invalidation === 'reuse') {
      storyHarness.requests.B.resolve(undefined);
      await flushRenderQueue();
      jest.runOnlyPendingTimers();
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith(PAGE_RENDERED);
      storyHarness.wrapper.destroy();
    }

    emitSpy.mockRestore();
  }
);

it('fetches on SSR without rendering waits or page events', async () => {
  const dispatch = jest.fn().mockResolvedValue({ content: {} });
  const context = {
    ...StoryblokMixin.methods,
    $route: { path: '/SSR', query: {} },
    $store: { dispatch },
    storyblok: { fetchStory: true },
    storyblokPath: '',
    storeCodeFromHeader: undefined
  };

  await StoryblokMixin.serverPrefetch.call(context);

  expect(dispatch).toHaveBeenCalledWith('storyblok/loadStory', { fullSlug: 'SSR' });
  expect(loader).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
  expect(emitPageRenderedEvent).not.toHaveBeenCalled();
});
