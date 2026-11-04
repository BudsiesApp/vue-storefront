import { Actions } from './actions.interface';
import { AvailabilityRules } from './availability-rules.interface';
import { GalleryImage } from './gallery-image.interface';

export interface OptionValue {
  id: string,
  bundleOptionItemId?: number,
  productId?: number | null,
  sku?: string,
  name?: string,
  description?: string,
  thumbnailUrl?: string,
  attachmentUrl?: string,
  color?: string,
  price?: number | null,
  specialPrice?: number | null,
  specialPriceFromDate?: string | null,
  specialPriceToDate?: string | null,
  isEnabled: boolean,
  isDefault: boolean,
  availabilityRules?: AvailabilityRules,
  actions?: Actions,
  sn: number,
  galleryImages?: GalleryImage[],
  originalValueId?: string
}
