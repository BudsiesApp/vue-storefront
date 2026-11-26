import { mount } from '@vue/test-utils';
import { i18nInjectionKey } from '@vue-storefront/core/application-services';
import VideoPlaybackButton from '../../../components/video-playback-button.vue';
import { playbackButtonIcon } from '../../../helpers/video-playback-button';

it('renders translated accessible actions, matching decorative icons and emits activation', async () => {
  const wrapper = mount(VideoPlaybackButton, {
    propsData: { isPaused: true },
    provide: { [i18nInjectionKey as symbol]: { t: (key: string) => `translated:${key}` } }
  });
  expect(wrapper.element.tagName).toBe('BUTTON');
  expect(wrapper.attributes('type')).toBe('button');
  expect(wrapper.attributes('aria-label')).toBe('translated:Play video');
  expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true');
  expect(wrapper.find('span').element.innerHTML).toBe(playbackButtonIcon(true).replace('/></svg>', '></path></svg>'));
  await wrapper.trigger('click');
  expect(wrapper.emitted('activate')).toHaveLength(1);
  await wrapper.setProps({ isPaused: false });
  expect(wrapper.attributes('aria-label')).toBe('translated:Pause video');
  expect(wrapper.find('span').element.innerHTML).toBe(playbackButtonIcon(false).replace('/></svg>', '></path></svg>'));
  wrapper.destroy();
});
