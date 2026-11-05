import { onMounted, Ref, ref, watch, watchEffect } from 'vue';

export type StoryRenderedPayload = string | string[];

export function useStoryblokReadinessTracker (
  trackingKey: Ref<string | undefined>,
  storyDependencies: Ref<string[]>,
  onReady: () => void
) {
  const isMounted = ref(false);
  const renderedStoryFullSlugs = ref<string[]>([]);
  const hasEmitted = ref(false);

  watch(
    [trackingKey, () => storyDependencies.value.join('|')],
    () => {
      renderedStoryFullSlugs.value = renderedStoryFullSlugs.value.filter(fullSlug => storyDependencies.value.includes(fullSlug));
      hasEmitted.value = false;
    },
    { flush: 'sync' }
  );

  onMounted(() => {
    isMounted.value = true;
  });

  function onStoryRendered (payload: StoryRenderedPayload): void {
    const fullSlugs = Array.isArray(payload) ? payload : [payload];

    renderedStoryFullSlugs.value = [...new Set([
      ...renderedStoryFullSlugs.value,
      ...fullSlugs.filter(fullSlug => storyDependencies.value.includes(fullSlug))
    ])];
  }

  watchEffect(() => {
    if (!isMounted.value || trackingKey.value === undefined || hasEmitted.value) {
      return;
    }

    if (!storyDependencies.value.every(fullSlug => renderedStoryFullSlugs.value.includes(fullSlug))) {
      return;
    }

    hasEmitted.value = true;
    onReady();
  });

  return { onStoryRendered };
}
