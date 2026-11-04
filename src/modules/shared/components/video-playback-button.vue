<template>
  <button
    type="button"
    :class="buttonClass"
    :aria-label="label"
    @click="$emit('activate')"
  >
    <span class="video-playback-toggle__icon" aria-hidden="true" v-html="icon" />
  </button>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useI18n } from '@vue-storefront/core/application-services';
import { playbackButtonIcon, VIDEO_PLAYBACK_BUTTON_CLASS } from '../helpers/video-playback-button';

export default defineComponent({
  name: 'VideoPlaybackButton',
  props: {
    isPaused: {
      type: Boolean,
      required: true
    }
  },
  setup (props) {
    const i18n = useI18n();

    return {
      buttonClass: VIDEO_PLAYBACK_BUTTON_CLASS,
      icon: computed(() => playbackButtonIcon(props.isPaused)),
      label: computed(() => String(props.isPaused ? i18n.t('Play video') : i18n.t('Pause video')))
    };
  }
});
</script>
