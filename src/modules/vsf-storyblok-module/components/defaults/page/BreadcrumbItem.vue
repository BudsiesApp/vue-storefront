<template>
  <span class="breadcrumb-item">
    <template v-if="hasParent">
      <page-breadcrumbs :data="data.parent" />

      >
    </template>

    <router-link
      :key="data.id"
      :to="`/${data.slug}/`"
    >
      {{ data.name }}
    </router-link>
  </span>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import { ParentData } from '../../../types/parent-data.interface';

export default Vue.extend({
  name: 'PageBreadcrumbs',
  props: {
    data: {
      type: Object as PropType<ParentData>,
      required: true
    }
  },
  computed: {
    hasParent (): boolean {
      return !!this.data.parent;
    }
  }
})
</script>
