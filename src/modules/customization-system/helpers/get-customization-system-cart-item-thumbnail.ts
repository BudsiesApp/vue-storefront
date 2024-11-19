import CartItem from 'core/modules/cart/types/CartItem';
import { ImageHandlerService } from 'src/modules/file-storage';

import { isFileUploadValue } from '../types/is-file-upload-value.typeguard';
import { WidgetType } from '../types/widget-type';

const THUMBNAIL_SIZE = 320;

export function getCustomizationSystemCartItemThumbnail (
  cartItem: CartItem,
  imageHandlerService: ImageHandlerService
): string | undefined {
  if (!cartItem.customizations || !cartItem.extension_attributes?.customization_state) {
    return;
  }

  const imageUploadCustomization = cartItem.customizations.find((customization) => {
    if (!customization.showInCart) {
      return false;
    }

    return customization.optionData?.displayWidget === WidgetType.IMAGE_UPLOAD;
  });

  if (!imageUploadCustomization) {
    return;
  }

  const customizationStateItem = cartItem.extension_attributes?.customization_state.find((item) => {
    return item.customization_id === imageUploadCustomization.id;
  });

  if (!customizationStateItem || !isFileUploadValue(customizationStateItem.value)) {
    return;
  }

  const url = Array.isArray(customizationStateItem.value)
    ? customizationStateItem.value[0].url
    : customizationStateItem.value.url;

  return imageHandlerService.getThumbnailUrl(url, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
}
