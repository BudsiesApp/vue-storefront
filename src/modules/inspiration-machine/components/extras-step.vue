<template>
  <div class="inspiration-machine-extras-step">
    <SfButton class="_button" @click="onContinueButtonClick">
      {{ $t('Continue') }}
    </SfButton>

    <ul class="_list">
      <li v-for="extra in extras" :key="extra.id">
        <inspiration-machine-selectable-item
          v-model="selectedValue"
          :option="extra"
          type="checkbox"
          name="inspiration-machine-extras"
        />
      </li>
    </ul>

    <SfButton class="_button" @click="onContinueButtonClick">
      {{ $t('Continue') }}
    </SfButton>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import { SfButton } from '@storefront-ui/vue';

import { SelectableItem } from '../types/selectable-item.interface';

import InspirationMachineSelectableItem from './selectable-item.vue';

export default Vue.extend({
  name: 'InspirationMachineExtrasStep',
  props: {
    value: {
      type: Array as PropType<number[]>,
      default: () => []
    },
    extras: {
      type: Array as PropType<SelectableItem[]>,
      required: true
    }
  },
  components: {
    InspirationMachineSelectableItem,
    SfButton
  },
  computed: {
    selectedValue: {
      get (): number[] | undefined {
        return this.value;
      },
      set (value: number[] | undefined): void {
        this.$emit('input', value);
      }
    }
  },
  methods: {
    onContinueButtonClick (): void {
      this.$emit('extras-selected');
    }
  }
})
</script>

<style lang="scss" scoped>
@import "../css/mixins.scss";

.inspiration-machine-extras-step {

  ._list {
    @include selectable-items-list;

    margin-top: var(--spacer-base);
  }

  ._button {
    margin: 0 auto;
    width: 60%;

    &:last-child {
      margin-top: var(--spacer-base);
    }
  }
}
</style>
