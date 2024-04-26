import { Store } from 'vuex';
import { computed, onMounted, onServerPrefetch } from '@vue/composition-api';

import RootState from '@vue-storefront/core/types/RootState';

import { NavigationColumnData } from '../types/navigation-column-data.interface';
import { NavigationItemData } from '../types/navigation-item-data.interface';
import { StoryblokState, StoryblokStory } from '../types/State';
import { NavigationItem } from '../types/navigation-item.interface';
import { NavigationColumn } from '../types/navigation-column.interface';
import { isStoryblokPreview } from '../helpers/is-storyblok-preview.function';
import convertDisplayValueToClass from '../helpers/convert-display-value-to-class';

const pageLayoutStorySlug = 'default-page-layout';

function getClasses (data: NavigationColumnData | NavigationItemData): string[] {
  const classes: string[] = [];
  const displayClass = convertDisplayValueToClass(data.display, isStoryblokPreview());

  if (displayClass) {
    classes.push(displayClass);
  }

  return classes;
}

function toNavigationColumn (data: NavigationColumnData): NavigationColumn {
  return {
    title: data.title,
    items: data.items.map(toNavigationItem),
    classes: getClasses(data)
  }
}

function toNavigationItem (data: NavigationItemData): NavigationItem {
  const classes: string[] = [];
  const displayClass = convertDisplayValueToClass(data.display, isStoryblokPreview());

  if (displayClass) {
    classes.push(displayClass);
  }

  return {
    ...data,
    items: data.sub_items.map(toNavigationColumn)
  }
}

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

  const headerItems = computed<NavigationItem[]>(() => {
    if (!pageLayoutStory.value) {
      return [];
    }

    return (pageLayoutStory.value.content.header_items as NavigationItemData[])
      .map(toNavigationItem);
  });

  const footerItems = computed<NavigationColumn[]>(() => {
    if (!pageLayoutStory.value) {
      return [];
    }

    return (pageLayoutStory.value.content.footer_items as NavigationColumnData[])
      .map(toNavigationColumn);
  });

  const mobileMenuItems = computed<NavigationColumn[]>(() => {
    const items: NavigationColumn[] = [];

    headerItems.value.forEach((item) => {
      items.push(...item.items)
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
