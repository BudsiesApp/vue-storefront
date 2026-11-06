import { nextTick } from 'vue';
import { Logger } from '@vue-storefront/core/lib/logger';

import { loadStoryblokComponentGroup, StoryblokComponentGroup } from '../components';

export async function waitForStoryblokContentRender (): Promise<void> {
  try {
    await loadStoryblokComponentGroup(StoryblokComponentGroup.CORE);
  } catch (error) {
    Logger.error(error, 'storyblok')();
  }

  await nextTick();
  await new Promise<void>(resolve => setTimeout(resolve, 0));
}
