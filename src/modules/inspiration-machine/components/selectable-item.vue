<template>
  <label
    class="inspiration-machine-selectable-item"
    :class="{'-selected': isSelected}"
    @click="onItemClick"
  >
    <SfHeading class="_name" :level="4" :title="option.name" />

    <input
      :type="type"
      :value="option.id"
      :name="name"
      class="_input"
      v-model="selectedOptionId"
    >

    <div class="_checkmark" v-if="showCheckmark" />

    <div class="_image-container">
      <base-image
        class="_image"
        :src="option.icon"
        :aspect-ratio="1"
        :alt="option.name"
        width="400px"
      />
    </div>

    <div
      class="_description"
      v-if="description"
    >
      {{ description }}
    </div>
  </label>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import { SfHeading } from '@storefront-ui/vue';

import { BaseImage } from 'src/modules/budsies';

import { SelectableItem } from '../types/selectable-item.interface';

export default Vue.extend({
  name: 'InspirationMachineSelectableItem',
  props: {
    value: {
      type: [Number, Array] as PropType<number | number[] | undefined>,
      default: undefined
    },
    option: {
      type: Object as PropType<SelectableItem>,
      required: true
    },
    description: {
      type: String,
      default: undefined
    },
    type: {
      type: String as PropType<'radio' | 'checkbox'>,
      default: 'radio'
    },
    name: {
      type: String,
      required: true
    }
  },
  components: {
    BaseImage,
    SfHeading
  },
  computed: {
    selectedOptionId: {
      get (): number | number[] | undefined {
        return this.value;
      },
      set (value: number | number[] | undefined): void {
        this.$emit('input', value);
      }
    },
    isSelected (): boolean {
      if (!this.selectedOptionId) {
        return false;
      }

      if (this.type === 'radio') {
        return this.selectedOptionId === this.option.id;
      }

      return (this.selectedOptionId as number[]).includes(this.option.id);
    },
    showCheckmark (): boolean {
      return this.type === 'checkbox';
    }
  },
  methods: {
    onItemClick (): void {
      if (!this.isSelected) {
        return;
      }

      this.$emit('selected-item-click');
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~@storefront-ui/shared/styles/helpers/breakpoints";

.inspiration-machine-selectable-item {
  --heading-padding: 0;

  display: inline-block;
  box-sizing: border-box;
  background-color: var(--c-secondary);
  padding: var(--spacer-sm);
  border-radius: 5px;
  cursor: pointer;
  text-align: center;
  height: 100%;
  width: 100%;
  position: relative;

  ._input {
    visibility: hidden;
    position: absolute;
  }

  ._image-container {
    box-sizing: border-box;
    border-radius: 50%;
    width: 100%;
    overflow: hidden;
    display: flex;
    margin-top: var(--spacer-sm);
    border: 4px solid transparent;
  }

  ._description {
    margin-top: var(--spacer-sm);
  }

  ._checkmark {
    position: absolute;
    width: 38px;
    height: 31px;
    left: var(--spacer-2xs);
    top: 0;

    background: url("../assets/checkmark.png");
    background-repeat: no-repeat;
    background-position: top left;
  }

  &.-selected {
    ._image-container {
      border-color: var(--c-primary);
    }

    ._checkmark {
      background: url("../assets/checkmark-checked.png");
    }
  }

  @include for-desktop {
    ._image-container,
    ._description {
      margin-top: var(--spacer-base);
    }
  }
}
</style>
