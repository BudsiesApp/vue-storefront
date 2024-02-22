import {
  makeHydrationBlocker
} from 'vue-lazy-hydration/src/utils/hydration-blocker';

import { getStoryblokQueryParams } from '../helpers';

export function hydrateInPreviewOrWhenVisible (componentOrFactory: Vue | (() => any)) {
  return makeHydrationBlocker(componentOrFactory, {
    beforeCreate () {
      const { id } = getStoryblokQueryParams(this.$route)
      this.whenVisible = true;

      if (id) {
        this.hydrate();
      }
    },
    render (h) {
      return h(this.Nonce, {
        attrs: { ...this.$attrs },
        on: this.$listeners,
        scopedSlots: this.$scopedSlots
      }, this.$slots.default);
    }
  });
}