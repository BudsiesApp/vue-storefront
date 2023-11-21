<template>
  <div class="page-breadcrumbs" v-if="hasParent">
    <span
      v-for="parent in parents"
      :key="parent.id"
    >
      <router-link
        :to="parent.slug ? `/${parent.slug}/` : '/'"
      >
        {{ parent.name }}
      </router-link>

      >
    </span>

    <span class="_active" v-show="storyName">
      {{ storyName }}
    </span>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import PageData from '../../types/page-data.interface';

import { ParentData } from 'src/modules/vsf-storyblok-module/types/parent-data.interface';

export default Vue.extend({
  name: 'PageBreadcrumbs',
  props: {
    story: {
      type: Object as PropType<Record<string, any>>,
      required: true
    }
  },
  computed: {
    hasParent (): boolean {
      return !!this.parents.length;
    },
    pageData (): PageData {
      return this.story.content;
    },
    parents (): ParentData[] {
      const parents: ParentData[] = [];
      if (!this.pageData.parent) {
        return parents;
      }

      let parent: ParentData | undefined = this.pageData.parent;

      while (parent) {
        if (parent.slug === 'home') {
          parent.slug = '';
        }

        parents.push(parent);
        parent = parent.parent;
      }

      return parents.reverse();
    },
    storyName (): string {
      return this.story.name;
    }
  }
})
</script>

<style lang="scss" scoped>
.page-breadcrumbs {
  margin: var(--spacer-sm) var(--spacer-base);
}
</style>
