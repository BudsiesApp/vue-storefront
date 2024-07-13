import { CustomizationStateItem } from './customization-state-item.interface';

export interface ExtensionAttributes {
  customization_state: CustomizationStateItem[],
  plushie_id?: string
}
