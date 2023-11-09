<template>
  <div class="page-breadcrumbs" v-if="hasParent">
    <breadcrumb-item :data="pageData.parent" />

    >

    <span class="_active" v-if="storyName">
      {{ storyName }}
    </span>
  </div>
</template>

<script lang="ts">
import Vue, { PropType, VueConstructor } from 'vue';

import PageData from '../../../types/page-data.interface';

import BreadcrumbItem from './BreadcrumbItem.vue';

interface InjectedServices {
  storyName: string
}

export default (Vue as VueConstructor<Vue & InjectedServices>).extend({
  name: 'PageBreadcrumbs',
  props: {
    pageData: {
      type: Object as PropType<PageData>,
      required: true
    }
  },
  inject: {
    storyName: { from: 'storyName' }
  },
  components: {
    BreadcrumbItem
  },
  computed: {
    hasParent (): boolean {
      return !!this.pageData.parent;
    }
  }
})
</script>

<style lang="scss" scoped>
.page-breadcrumbs {
  margin: var(--spacer-sm) var(--spacer-base);
}
</style>
