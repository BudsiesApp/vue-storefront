<template>
  <div class="checkbox-widget">
    <m-checkbox
      class="checkbox-widget"
      :disabled="isDisabled"
      :valid="isValid"
      v-model="isSelected"
    />

    <div class="_error-message">
      {{ error }}
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from '@vue/composition-api';

// TODO: avoid imports from theme in module
import MCheckbox from 'theme/components/molecules/m-checkbox.vue';

import { OptionValue } from '../types/option-value.interface';

export default defineComponent({
  name: 'CheckboxWidget',
  components: {
    MCheckbox
  },
  props: {
    error: {
      type: String,
      default: undefined
    },
    isDisabled: {
      type: Boolean,
      default: false
    },
    value: {
      type: [String, Array] as PropType<string | string[] | undefined>,
      default: undefined
    },
    values: {
      type: Array as PropType<OptionValue[]>,
      default: () => []
    }
  },
  setup (props, { emit }) {
    const isSelected = computed<boolean>({
      get: () => {
        return !!props.value
      },
      set: (selected) => {
        emit('input', selected ? props.values[0] : undefined);
      }
    });
    const isValid = computed<boolean>(() => {
      return !props.error;
    });

    return {
      isSelected,
      isValid
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~@storefront-ui/shared/styles/helpers/typography";

.checkbox-widget {
  ._error-message {
    color: var(--input-error-message-color, var(--c-danger));
    height: calc(var(--font-xs) * 1.2);

    @include font(
      --input-error-message-font,
      var(--font-medium),
      var(--font-xs),
      1.2,
      var(--font-family-secondary)
    );
  }
}
</style>
