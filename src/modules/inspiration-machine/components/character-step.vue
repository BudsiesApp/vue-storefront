<template>
  <ul class="inspiration-machine-character-step">
    <li v-for="character in characters" :key="character.id">
      <inspiration-machine-selectable-item
        v-model="selectedValue"
        :option="character"
        name="inspiration-machine-character"
        type="radio"
        @selected-item-click="$emit('selected-item-click')"
      />
    </li>
  </ul>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import { SelectableItem } from '../types/selectable-item.interface';

import InspirationMachineSelectableItem from './selectable-item.vue';

export default Vue.extend({
  name: 'InspirationMachineCharacterStep',
  props: {
    value: {
      type: Number as PropType<number | undefined>,
      default: undefined
    },
    characters: {
      type: Array as PropType<SelectableItem[]>,
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

.inspiration-machine-character-step {
  @include selectable-items-list;
}
</style>
