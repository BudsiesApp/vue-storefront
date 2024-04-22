import { Store } from 'vuex';
import { computed, onMounted, onServerPrefetch } from '@vue/composition-api';

import RootState from '@vue-storefront/core/types/RootState';

import { NavigationColumnData } from '../types/navigation-column-data.interface';
import { NavigationItemData } from '../types/navigation-item-data.interface';
import { StoryblokState, StoryblokStory } from '../types/State';

const pageLayoutStorySlug = 'default-page-layout';

export function useStoryblokPageLayout (
  store: Store<RootState & {storyblok: StoryblokState}>,
  previewPageLayoutStory?: StoryblokStory
) {
  const storyData = computed<StoryblokStory | undefined>(() => {
    if (previewPageLayoutStory) {
      return previewPageLayoutStory;
    }

    return store.state.storyblok.stories[pageLayoutStorySlug];
  });

  const pageLayoutStory = computed<Record<string, any> | undefined>(() => {
    if (!storyData.value) {
      return;
    }

    return storyData.value.story;
  });

  const headerItems = computed<NavigationItemData[]>(() => {
    if (!pageLayoutStory.value) {
      return [];
    }

    return pageLayoutStory.value.content.header_items as NavigationItemData[];
  });

  const footerItems = computed<NavigationColumnData[]>(() => {
    if (!pageLayoutStory.value) {
      return [];
    }

    return pageLayoutStory.value.content.footer_items as NavigationColumnData[];
  });

  const mobileMenuItems = computed<NavigationColumnData[]>(() => {
    const items: NavigationColumnData[] = [];

    headerItems.value.forEach((item) => {
      items.push(...item.sub_items)
    });

    return items;
  });

  async function loadStory (): Promise<void> {
    await store.dispatch(`storyblok/loadStory`, {
      fullSlug: pageLayoutStorySlug
    });
  }

  onServerPrefetch(() => {
    return loadStory();
  });

  onMounted(() => {
    loadStory();
  });

  return {
    footerItems,
    headerItems,
    mobileMenuItems
  }
}
