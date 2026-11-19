import { computed, Ref } from 'vue';

import { BudsieStatus } from 'src/modules/shared';

import { isImageUploadCustomization } from '../helpers/is-image-upload-customization';
import { Customization } from '../types/customization.interface';
import { CustomizationStateItem } from '../types/customization-state-item.interface';
import { CustomizationType } from '../types/customization-type';
import { DraftOrderItem } from '../types/draft-order-item.interface';

export function useAwaitingArtworkCustomizationsFilter (
  customizations: Ref<Customization[]>,
  initialState: Ref<CustomizationStateItem[]>,
  draftOrderItem: Ref<DraftOrderItem | undefined>
) {
  const isAwaitingArtwork = computed<boolean>(() => draftOrderItem.value?.status_id === BudsieStatus.AWAITING_ARTWORK);

  const productCustomizations = computed<Customization[]>(() => {
    if (!isAwaitingArtwork.value) {
      return customizations.value;
    }

    return customizations.value.flatMap((customization) => {
      if (customization.type === CustomizationType.OPTIONS_GROUP) {
        return [customization];
      }

      if (!isImageUploadCustomization(customization)) {
        return [];
      }

      const { availabilityRules, ...image } = customization;
      return [image];
    });
  });

  const initialCustomizationState = computed<CustomizationStateItem[]>(() => {
    if (!isAwaitingArtwork.value) {
      return initialState.value;
    }

    const imageIds = new Set(productCustomizations.value.filter(isImageUploadCustomization).map(image => image.id));
    return initialState.value.filter(item => imageIds.has(item.customization_id));
  });

  return { productCustomizations, initialCustomizationState };
}
