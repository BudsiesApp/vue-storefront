import Vue, { computed, ref } from 'vue';
import Vuex from 'vuex';
import { mount } from '@vue/test-utils';
import { useStoryblokReadinessTracker } from '../../../composables/use-storyblok-readiness-tracker';

function harness (initialTrackingKey: string | undefined, initialStoryDependencies: string[]) {
  const trackingKey = ref(initialTrackingKey);
  const storyDependencies = ref(initialStoryDependencies);
  const onReady = jest.fn();
  let onStoryRendered!: (payload: string | string[]) => void;
  const Component = Vue.extend({
    setup() {
      onStoryRendered = useStoryblokReadinessTracker(
        trackingKey,
        storyDependencies,
        onReady
      ).onStoryRendered;
      onStoryRendered('top');

      expect(onReady).not.toHaveBeenCalled();

      return {};
    },
    render: h => h('div')
  });
  const wrapper = mount(Component);

  return {
    trackingKey,
    storyDependencies,
    onReady,
    onStoryRendered: (payload: string | string[]) => onStoryRendered(payload),
    wrapper
  };
}

it('retains pre-mount reports but requires own data; matches single/array payloads and emits once', async () => {
  const harnessResult = harness(undefined, ['top', 'bottom']);

  harnessResult.onStoryRendered('unrelated');
  await Vue.nextTick();

  expect(harnessResult.onReady).not.toHaveBeenCalled();

  harnessResult.trackingKey.value = 'A';
  await Vue.nextTick();

  expect(harnessResult.onReady).not.toHaveBeenCalled();

  harnessResult.onStoryRendered(['bottom', 'unrelated']);
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(1);

  harnessResult.onStoryRendered(['top', 'bottom']);
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(1);

  harnessResult.wrapper.destroy();
});

it('retains unchanged dependency reports across A to B to A keys', async () => {
  const harnessResult = harness('A', ['top']);

  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(1);

  for (const trackingKey of ['B', 'A']) {
    harnessResult.trackingKey.value = trackingKey;
    await Vue.nextTick();
  }

  expect(harnessResult.onReady).toHaveBeenCalledTimes(3);

  harnessResult.wrapper.destroy();
});

it('retains unchanged dependencies, drops removed reports and waits when a slug is reintroduced', async () => {
  const harnessResult = harness('A', ['top', 'bottom']);

  harnessResult.onStoryRendered('bottom');
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(1);

  harnessResult.storyDependencies.value = ['top', 'new'];
  harnessResult.onStoryRendered('bottom');
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(1);

  harnessResult.onStoryRendered('new');
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(2);

  harnessResult.storyDependencies.value = ['top'];
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(3);

  harnessResult.storyDependencies.value = ['top', 'bottom'];
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(3);

  harnessResult.onStoryRendered('bottom');
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(4);

  harnessResult.wrapper.destroy();
});

it('emits across empty-list keys and excludes absent conditional stories', async () => {
  const harnessResult = harness('A', []);

  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(1);

  harnessResult.trackingKey.value = 'B';
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(2);

  harnessResult.storyDependencies.value = ['conditional'];
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(2);

  harnessResult.storyDependencies.value = [];
  await Vue.nextTick();

  expect(harnessResult.onReady).toHaveBeenCalledTimes(3);

  harnessResult.wrapper.destroy();
});

it('keeps computed inputs over Vuex getters fresh after the store rebuilds its getters', async () => {

  Vue.use(Vuex);

  const store = new Vuex.Store({
    modules: {
      cart: {
        namespaced: true,
        state: { items: [{ qty: '1' }] },
        getters: { items: state => state.items },
        mutations: {
          clear (state) {
            state.items = [];
          }
        }
      }
    }
  });
  const onReady = jest.fn();
  let totalItems!: { value: number };
  const wrapper = mount(Vue.extend({
    setup () {
      totalItems = computed(() => store.getters['cart/items'].length);
      const storyDependencies = computed(() => totalItems.value ? ['blocks/cart_shipping_handling'] : []);

      useStoryblokReadinessTracker(ref('cart'), storyDependencies, onReady);

      return {};
    },
    render: h => h('div')
  }));

  await Vue.nextTick();
  // Lazy module registration rebuilds the getters, which reorders their subscriptions.
  store.registerModule('lazy', { state: {} });
  // A later reader, such as a mapGetters computed during render, evaluates the rebuilt getter
  // and subscribes it after the tracker's existing subscriptions.
  expect(store.getters['cart/items']).toHaveLength(1);
  await Vue.nextTick();
  store.commit('cart/clear');
  await Vue.nextTick();

  expect(totalItems.value).toBe(0);
  expect(onReady).toHaveBeenCalledTimes(1);

  wrapper.destroy();
});
