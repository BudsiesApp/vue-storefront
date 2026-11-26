/* eslint-disable vue/one-component-per-file */
import Vue, { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createRenderer } from 'vue-server-renderer';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import { useVideoPlaybackToggle } from '../../../composables/use-video-playback-toggle';
import { VIDEO_PLAYBACK_COLLECTION } from '../../../helpers/video-playback';

const environment = require('@vue-storefront/core/helpers');

jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { init: jest.fn(), get: jest.fn() } }));
jest.mock('@vue-storefront/core/helpers', () => ({ __esModule: true, isServer: false }));
jest.mock('src/modules/shared', () => ({ BEFORE_STORE_BACKEND_API_REQUEST: 'before-request' }));
jest.mock('src/modules/budsies/components/BaseImage.vue', () => ({}));
jest.mock('src/modules/budsies/components/ProductStructuredData.vue', () => ({}));
jest.mock('src/modules/budsies/store', () => ({ budsiesStore: {} }));
jest.mock('src/modules/budsies/helpers/debug-data.factory', () => ({ debugDataFactory: () => ({}) }));
jest.mock('src/modules/budsies/helpers/fill-product-with-additional-fields.function', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({ __esModule: true, default: { $on: jest.fn() } }));

const flush = async () => { await Vue.nextTick(); await Promise.resolve(); await Vue.nextTick(); };

const Fixture = defineComponent({
  template: '<div><video v-if="visible" ref="video" autoplay :key="elementKey" /><button v-if="isEnabled">{{ isPaused ? "Play" : "Pause" }}</button></div>',
  setup () {
    const video = ref<HTMLVideoElement | null>(null);
    const key = ref('asset:id:1');
    const visible = ref(false);
    const elementKey = ref(0);
    return {
      video, key, visible, elementKey,
      ...useVideoPlaybackToggle(video, key, ref({ native: true, autoplay: true, controls: false }), ref(false))
    };
  }
});

describe('useVideoPlaybackToggle', () => {
  const getItem = jest.fn();
  let pause: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    getItem.mockResolvedValue('paused');
    (StorageManager.get as jest.Mock).mockReturnValue({ getItem });
    pause = jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    (environment as { isServer: boolean }).isServer = false;
  });
  afterEach(() => pause.mockRestore());

  it('binds late refs, restores new keys/elements and detaches on unmount', async () => {
    const wrapper = mount(Fixture);
    expect(getItem).not.toHaveBeenCalled();
    const vm = wrapper.vm as any;
    vm.visible = true;
    await flush();
    const first = wrapper.find('video').element;
    expect(getItem).toHaveBeenLastCalledWith('asset:id:1');
    expect(pause).toHaveBeenCalledTimes(1);
    vm.key = 'asset:id:2';
    await flush();
    expect(getItem).toHaveBeenLastCalledWith('asset:id:2');
    vm.elementKey++;
    await flush();
    const current = wrapper.find('video').element;
    expect(current).not.toBe(first);
    const remove = jest.spyOn(current, 'removeEventListener');
    wrapper.destroy();
    expect(remove.mock.calls.map(call => call[0])).toEqual(['play', 'pause', 'ended', 'loadeddata']);
  });

  it('preserves SSR and initial hydration markup and avoids pre-mount storage', async () => {
    const Harness = defineComponent({
      render (h) {
        return h('div', [h('video', { ref: 'video', attrs: { autoplay: true } }),
          this.isEnabled ? h('button', [this.isPaused ? 'Play' : 'Pause']) : null]);
      },
      setup () {
        const video = ref<HTMLVideoElement | null>(null);
        return { video, ...useVideoPlaybackToggle(video, ref('key'),
          ref({ native: true, autoplay: true, controls: false }), ref(false)) };
      }
    });
    (environment as { isServer: boolean }).isServer = true;
    const html = await createRenderer().renderToString(new Vue({ render: h => h(Harness) }));
    expect(html).toContain('autoplay="autoplay"');
    expect(html).toContain('<button>Play</button>');
    expect(StorageManager.get).not.toHaveBeenCalled();
    expect(StorageManager.init).not.toHaveBeenCalled();
    (environment as { isServer: boolean }).isServer = false;
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const app = new Vue({ render: h => h(Harness) });
    app.$mount(host.firstElementChild as Element, true);
    await flush();
    expect(app.$el.outerHTML).toContain('<button>Play</button>');
    expect(pause).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    app.$destroy();
    host.remove();
    error.mockRestore();
  });

  it('registers browser storage in Budsies before mounting consumers and skips it on SSR', async () => {
    const { BudsiesModule } = require('src/modules/budsies');
    const context = { store: { registerModule: jest.fn() } };
    (environment as { isServer: boolean }).isServer = true;
    await BudsiesModule(context);
    expect(StorageManager.init).not.toHaveBeenCalledWith(VIDEO_PLAYBACK_COLLECTION);
    (environment as { isServer: boolean }).isServer = false;
    await BudsiesModule(context);
    expect(StorageManager.init).toHaveBeenCalledWith(VIDEO_PLAYBACK_COLLECTION);
    const wrapper = mount(Fixture);
    (wrapper.vm as any).visible = true;
    await flush();
    expect((StorageManager.init as jest.Mock).mock.invocationCallOrder.slice(-1)[0])
      .toBeLessThan((StorageManager.get as jest.Mock).mock.invocationCallOrder[0]);
    wrapper.destroy();
  });
});
