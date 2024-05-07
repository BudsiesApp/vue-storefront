import { AvailabilityRules } from './availability-rules.interface';
import { CustomizationType } from './customization-type';
import { OptionData } from './option-data.interface';
import { OptionVariant } from './option-variant.interface';

export interface Customization {
  id: string,
  parentId?: string,
  name: string,
  title?: string,
  type: CustomizationType,
  sn: number,
  isEnabled: boolean,
  bundleOptionId: number,
  availabilityRules: AvailabilityRules,
  optionData?: OptionData,
  variants?: OptionVariant[]
}
