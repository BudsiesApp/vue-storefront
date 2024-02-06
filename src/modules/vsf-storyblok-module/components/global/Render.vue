<template>
  <component
    v-if="component"
    v-editable="item"
    v-bind="scopeIdAttribute"
    :is="component"
    :item="item"
    v-on="$listeners"
  />
</template>

<script>
import { components } from '../'

export default {
  name: 'RenderBlok',
  computed: {
    component: function () {
      return components[this.item.component] || components.debug
    },
    components: function () {
      return components
    },
    scopeIdAttribute () {
      if (!this.parentScopeId) {
        return {};
      }

      return { [`${this.parentScopeId}`]: true }
    }
  },
  props: {
    item: {
      type: Object,
      required: true
    },
    parentScopeId: {
      type: String,
      default: undefined
    }
  }
}
</script>
