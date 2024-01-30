import {
  makeHydrationBlocker
} from 'vue-lazy-hydration/src/utils/hydration-blocker';

import { getStoryblokQueryParams } from '../helpers';

export function hydrateInPreviewOnly (componentOrFactory: Vue | (() => any)) {
  return makeHydrationBlocker(componentOrFactory, {
    beforeCreate () {
      const { id } = getStoryblokQueryParams(this.$route)
      this.never = !id;

      if (id) {
        this.hydrate();
      }
    }
  });
}
