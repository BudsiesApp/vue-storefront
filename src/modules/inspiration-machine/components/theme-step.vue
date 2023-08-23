<template>
  <ul class="inspiration-machine-theme-step">
    <li
      class="_item"
      v-for="theme in themes"
      :key="theme.id"
    >
      <inspiration-machine-selectable-item
        v-model="selectedValue"
        :description="theme.description"
        :option="theme"
        name="inspiration-machine-theme"
        type="radio"
        @selected-item-click="$emit('selected-item-click')"
      />
    </li>
  </ul>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import { Theme } from '../types/theme.interface';

import InspirationMachineSelectableItem from './selectable-item.vue';

export default Vue.extend({
  name: 'InspirationMachineThemeStep',
  props: {
    value: {
      type: Number as PropType<number | undefined>,
      default: undefined
    },
    themes: {
      type: Array as PropType<Theme[]>,
      required: true
    }
  },
  components: {
    InspirationMachineSelectableItem
  },
  computed: {
    selectedValue: {
      get (): number | undefined {
        return this.value;
      },
      set (value: number | undefined): void {
        this.$emit('input', value);
      }
    }
  }
})
</script>

<style lang="scss" scoped>
@import "../css/mixins.scss";

.inspiration-machine-theme-step {
  @include selectable-items-list;
}
</style>
