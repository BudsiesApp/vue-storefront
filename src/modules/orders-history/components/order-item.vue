<template>
  <div
    class="order-item"
    :class="{ '-extendable': isExtendedInfoAvailable }"
  >
    <div class="_content">
      <div class="_info-container">
        <div class="_image-container">
          <BaseImage
            alt=""
            :lazy="false"
            :src="orderItemImage"
            :aspect-ratio="1"
          />
        </div>

        <div class="_base-info-container">
          <span class="_product-name">
            {{ item.display_id }} - {{ item.product.name }}
          </span>

          <order-item-progress-tracker
            :active-status="progressTrackerActiveStatus"
            :filtered-statuses-list="progressTrackerFilteredStatusesList"
            :max-statuses-to-display-horizontal="PROGRESS_TRACKER_MAX_HORIZONTAL_STATUSES_TO_DISPLAY_COUNT"
            v-if="canShowProgressTracker"
          />

          <div class="_cancelled" v-if="isOrderCancelledOrOnHoldOrCompleted">
            {{ isOrderCancelled ? $t('Order is Cancelled') : isOrderCompleted ? $t('Order is Completed') : $t('Order is On Hold') }}
          </div>

          <order-item-actions
            :actions-list="item.available_actions"
            :order-item="item"
            :order-id="orderId"
            v-if="showActions"
          />
        </div>
      </div>
    </div>

    <m-expandable-section
      v-if="isExtendedInfoAvailable"
      :initially-expanded="false"
      class="_item-details"
    >
      <template #title>
        <span class="_item-details-heading">{{ $t('Item details') }}</span>
      </template>

      <order-item-extended-info
        :item="item"
      />
    </m-expandable-section>

    <component
      v-if="alterationProductFormComponent"
      :is="alterationProductFormComponent"
      :order-item="item"
      :alteration-product="alterationProduct"
    />
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent, computed, inject, toRef } from 'vue';

import { BaseImage } from 'src/modules/budsies';
import { getCustomizationSystemThumbnail } from 'src/modules/customization-system';
import { ImageHandlerService } from 'src/modules/file-storage';

import Product from '@vue-storefront/core/modules/catalog/types/Product';

import { useOrderItemProgressTracker } from '../composables/use-order-item-progress-tracker';
import { OrderItem } from '../types/order-item';

import OrderItemActions from './order-item-actions.vue';
import OrderItemExtendedInfo from './order-item-extended-info.vue';
import OrderItemProgressTracker from './order-item-progress-tracker.vue';
import MExpandableSection from 'theme/components/molecules/m-expandable-section.vue';

const PROGRESS_TRACKER_MAX_HORIZONTAL_STATUSES_TO_DISPLAY_COUNT = 3;

export default defineComponent({
  name: 'OrderItem',
  components: {
    BaseImage,
    OrderItemActions,
    OrderItemExtendedInfo,
    OrderItemProgressTracker,
    MExpandableSection
  },
  props: {
    item: {
      type: Object as PropType<OrderItem>,
      required: true
    },
    orderId: {
      type: Number,
      required: true
    },
    alterationProduct: {
      type: Object as PropType<Product>,
      default: undefined
    }
  },
  setup (props) {
    const imageHandlerService = inject<ImageHandlerService>('ImageHandlerService');
    const alterationProductFormComponent = inject('AlterationProductForm');

    const showActions = computed<boolean>(() => {
      return props.item.available_actions.length > 0;
    });
    const orderItemImage = computed<string>(() => {
      const defaultImage = props.item.product.thumbnail;

      if (!imageHandlerService) {
        return defaultImage;
      }

      const customizationSystemThumbnail = getCustomizationSystemThumbnail(
        props.item.extension_attributes?.customizations,
        props.item.extension_attributes?.customization_states,
        imageHandlerService
      );

      if (!customizationSystemThumbnail) {
        return defaultImage;
      }

      return customizationSystemThumbnail;
    });

    const {
      activeStatus: progressTrackerActiveStatus,
      canShowExtendedProgressTracker,
      canShowProgressTracker,
      filteredStatusesList: progressTrackerFilteredStatusesList,
      isOrderCancelled,
      isOrderCompleted,
      isOrderCancelledOrOnHoldOrCompleted
    } = useOrderItemProgressTracker(
      toRef(props, 'item'),
      PROGRESS_TRACKER_MAX_HORIZONTAL_STATUSES_TO_DISPLAY_COUNT
    );

    const isExtendedInfoAvailable = computed<boolean>(() => {
      if (canShowProgressTracker.value) {
        return true;
      }

      return !!props.item.extension_attributes && !!Object.keys(props.item.extension_attributes).length;
    });

    return {
      alterationProductFormComponent,
      canShowExtendedProgressTracker,
      canShowProgressTracker,
      isExtendedInfoAvailable,
      isOrderCancelled,
      isOrderCompleted,
      isOrderCancelledOrOnHoldOrCompleted,
      orderItemImage,
      progressTrackerActiveStatus,
      progressTrackerFilteredStatusesList,
      showActions,
      PROGRESS_TRACKER_MAX_HORIZONTAL_STATUSES_TO_DISPLAY_COUNT
    }
  }
})
</script>

<style lang="scss" scoped>
.order-item {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--c-secondary);
  padding: var(--spacer-sm) var(--spacer-xs);
  --alteration-product-form-padding: 0 var(--spacer-xs) 0 0;

  ._content {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  ._info-container {
    display: flex;
    column-gap: var(--spacer-sm);
  }

  ._product-name {
    font-weight: bold;
  }

  ._image-container {
    display: flex;
    align-items: flex-start;
    flex: 1;
  }

  ._base-info-container {
    flex: 4;
    display: flex;
    flex-direction: column;
    row-gap: var(--spacer-sm);
  }

  ._item-details {
    border: 1px solid var(--c-secondary);
    margin-top: var(--spacer-sm);
    padding: var(--spacer-sm);
    --expandable-section-header-hor-align: flex-start;
    --expandable-section-body-margin-top: var(--spacer-sm);
  }

  ._mobile-image {
    width: 72px;
  }

  ._item-details-heading {
    --heading-title-font-size: var(--font-base);
    --heading-title-font-weight: var(--font-semibold);
    font-size: var(--heading-title-font-size);
    font-weight: var(--heading-title-font-weight);
    user-select: none;
  }

  .alteration-product-form {
    margin-top: var(--spacer-sm);
  }

  @media (min-width: 426px) {
    padding: var(--spacer-sm);
  }
}
</style>
