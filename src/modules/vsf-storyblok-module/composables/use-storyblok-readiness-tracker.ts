import {
  computed,
  onMounted,
  Ref,
  ref,
  watch
} from '@vue/composition-api';

type StoryReadyPayload = string | string[];

function createReadyStoryDependenciesDictionary (
  storyDependencies: string[]
): Record<string, boolean> {
  return storyDependencies.reduce<Record<string, boolean>>((result, dependencyName) => {
    result[dependencyName] = false;

    return result;
  }, {});
}

function normalizeStoryReadyPayload (
  storyReadyPayload: StoryReadyPayload
): string[] {
  return Array.isArray(storyReadyPayload)
    ? storyReadyPayload
    : [storyReadyPayload];
}

export function useStoryblokReadinessTracker (
  trackingKey: Ref<string | undefined>,
  storyDependencies: Ref<string[]>,
  onReady: () => void
) {
  const mountedTrackingKey: Ref<string | undefined> = ref(undefined);
  const readyStoryDependencies: Ref<Record<string, boolean>> = ref(
    createReadyStoryDependenciesDictionary(storyDependencies.value)
  );
  const emittedReadyTrackingKey: Ref<string | undefined> = ref(undefined);

  function markMountedReady (): void {
    mountedTrackingKey.value = trackingKey.value;
  }

  function resetReadinessTracking (): void {
    mountedTrackingKey.value = undefined;
    readyStoryDependencies.value = createReadyStoryDependenciesDictionary(storyDependencies.value);
    emittedReadyTrackingKey.value = undefined;
    markMountedReady();
  }

  function onStoryReady (
    storyReadyPayload: StoryReadyPayload
  ): void {
    const readyStoryFullSlugs = normalizeStoryReadyPayload(storyReadyPayload);
    const nextReadyStoryDependencies = {
      ...readyStoryDependencies.value
    };

    readyStoryFullSlugs.forEach((storyFullSlug) => {
      if (storyDependencies.value.indexOf(storyFullSlug) === -1) {
        return;
      }

      nextReadyStoryDependencies[storyFullSlug] = true;
    });

    readyStoryDependencies.value = nextReadyStoryDependencies;
  }

  const areStoryblokDependenciesReady = computed<boolean>(() => {
    const currentTrackingKey = trackingKey.value;

    if (!currentTrackingKey || mountedTrackingKey.value !== currentTrackingKey) {
      return false;
    }

    if (storyDependencies.value.length === 0) {
      return true;
    }

    return storyDependencies.value.every((dependencyName) => readyStoryDependencies.value[dependencyName]);
  });

  onMounted(() => {
    markMountedReady();
  });

  watch(trackingKey, (newValue, oldValue) => {
    if (newValue === oldValue) {
      return;
    }

    resetReadinessTracking();
  });

  watch(storyDependencies, (newValue, oldValue) => {
    if (newValue.join('|') === oldValue.join('|')) {
      return;
    }

    resetReadinessTracking();
  });

  watch(
    areStoryblokDependenciesReady,
    (value) => {
      const currentTrackingKey = trackingKey.value;

      if (!value || !currentTrackingKey || emittedReadyTrackingKey.value === currentTrackingKey) {
        return;
      }

      emittedReadyTrackingKey.value = currentTrackingKey;
      onReady();
    },
    { immediate: true }
  );

  return {
    onStoryReady
  };
}
