<template>
  <script v-html="structuredData" v-if="structuredData" />
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import Product from '@vue-storefront/core/modules/catalog/types/Product';
import { currentStoreView } from '@vue-storefront/core/lib/multistore';
import { getThumbnailPath, productThumbnailPath } from '@vue-storefront/core/helpers';

import { getProductDefaultPrice } from 'src/modules/shared';

export default Vue.extend({
  name: 'ProductStructuredData',
  props: {
    product: {
      type: Object as PropType<Product>,
      required: true
    }
  },
  computed: {
    structuredData (): string | undefined {
      if (!this.product) {
        return;
      }

      const storeView = currentStoreView();
      const price = getProductDefaultPrice(this.product, {});
      const finalPrice = price.special && price.special < price.regular
        ? price.special
        : price.regular;

      const data = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        sku: this.product.sku,
        image: getThumbnailPath(productThumbnailPath(this.product)),
        name: this.product.name,
        description: this.product.short_description,
        brand: {
          '@type': 'Brand',
          name: storeView.name
        },
        offers: {
          '@type': 'Offer',
          price: finalPrice,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition'
        }
      }

      return JSON.stringify(data);
    }
  }
})
</script>
