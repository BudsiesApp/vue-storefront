import {
  makeHydrationBlocker
} from 'vue-lazy-hydration/src/utils/hydration-blocker';

import { isStoryblokPreview } from './is-storyblok-preview.function';

export function hydrateInPreviewOrWhenVisible (componentOrFactory: Vue | (() => any)) {
  return makeHydrationBlocker(componentOrFactory, {
    beforeCreate () {
      const isPreview = isStoryblokPreview();
      this.whenVisible = true;

      if (isPreview) {
        this.hydrate();
      }
    },
    render (h) {
      return h(this.Nonce, {
        attrs: { ...this.$attrs },
        on: this.$listeners,
        scopedSlots: this.$scopedSlots,
        directives: this.$vnode.data.directives
      }, this.$slots.default);
    }
  });
}
