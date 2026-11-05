import { nextTick } from 'vue';
import { loadStoryblokComponentGroup, StoryblokComponentGroup } from '../components';

export async function waitForStoryblokContentRender (): Promise<void> {
  await loadStoryblokComponentGroup(StoryblokComponentGroup.CORE);
  await nextTick();
  await new Promise<void>(resolve => setTimeout(resolve, 0));
}
