import { computed, onBeforeUnmount, onMounted, ref, Ref, watch } from 'vue';
import { isServer } from '@vue-storefront/core/helpers';
import { bindVideoPlayback } from '../helpers/video-playback';

export function useVideoPlaybackToggle (
  video: Ref<HTMLVideoElement | null>,
  key: Ref<string>,
  configuration: Ref<{ native: boolean, autoplay: boolean, controls: boolean }>,
  preview: Ref<boolean>
) {
  const isPaused = ref(true);
  const isEnabled = computed(() => {
    return configuration.value.native && configuration.value.autoplay && !configuration.value.controls;
  });
  let binding: ReturnType<typeof bindVideoPlayback> | undefined;
  let stop: (() => void) | undefined;

  onMounted(() => {
    if (isServer) {
      return;
    }

    stop = watch(
      [video, key, isEnabled, preview],
      () => {
        binding?.dispose();
        binding = undefined;
        isPaused.value = true;

        if (!video.value || !isEnabled.value) {
          return;
        }

        binding = bindVideoPlayback(
          video.value,
          key.value,
          preview.value,
          paused => {
            isPaused.value = paused;
          }
        );
      },
      {
        immediate: true,
        flush: 'post'
      }
    );
  });

  onBeforeUnmount(() => {
    stop?.();
    binding?.dispose();
  });

  return {
    isPaused,
    isEnabled,
    toggle: () => binding?.toggle()
  };
}
