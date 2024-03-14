<template>
  <span
    class="storyblok-rich-text-price-component"
    :class="{'-colorful': isColorful}"
  >
    <span class="_regular-price" v-if="showRegularPrice">
      {{ formattedRegularPrice }}
    </span>

    <span class="_final-price">
      {{ formattedFinalPrice }}
    </span>
  </span>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'

import { formatPrice, getFinalPrice } from 'src/modules/shared/helpers/price';

export default Vue.extend({
  name: 'StoryblokRichTextPriceComponent',
  props: {
    regularPrice: {
      type: Number,
      required: true
    },
    specialPrice: {
      type: Number as PropType<number | null>,
      default: undefined
    },
    isPromo: {
      type: Boolean,
      default: true
    },
    isColorful: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    finalPrice (): number {
      return getFinalPrice({
        special: this.specialPrice || null,
        regular: this.regularPrice
      });
    },
    formattedFinalPrice (): string {
      return formatPrice(this.finalPrice);
    },
    formattedRegularPrice (): string {
      return formatPrice(this.regularPrice);
    },
    showRegularPrice (): boolean {
      return this.specialPrice !== null && this.isPromo;
    }
  }
})
</script>

<style lang="scss" scoped>
.storyblok-rich-text-price-component {
  ._regular-price {
    text-decoration: line-through;
    font-style: italic;
    font-weight: normal;
    margin-right: var(--spacer-2xs);
  }

  &.-colorful {
    font-size: 24px;

    ._regular-price {
      color: var(--c-warning);
      margin-right: var(--spacer-xs);
    }

    ._final-price {
      color: (var(--c-final-price), var(--c-accent));
      font-weight: bold;
    }
  }
}
</style>
