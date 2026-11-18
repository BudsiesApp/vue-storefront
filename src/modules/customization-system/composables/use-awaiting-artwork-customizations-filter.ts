import { Ref } from 'vue';

import { BudsieStatus } from 'src/modules/shared';

import { isImageUploadCustomization } from '../helpers/is-image-upload-customization';
import { Customization } from '../types/customization.interface';
import { CustomizationType } from '../types/customization-type';
import { DraftOrderItem } from '../types/draft-order-item.interface';

export function useAwaitingArtworkCustomizationsFilter (
  draftOrderItem: Ref<DraftOrderItem | undefined>
) {
  function customizationsFilter (customization: Customization): boolean {
    if (draftOrderItem.value?.status_id !== BudsieStatus.AWAITING_ARTWORK) {
      return true;
    }

    if (customization.type !== CustomizationType.OPTION) {
      return true;
    }

    return isImageUploadCustomization(customization);
  }

  return { customizationsFilter };
}
