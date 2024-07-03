import { CustomizationStateItem } from '../types/customization-state-item.interface';
import { Customization } from '../types/customization.interface';
import { isEmailCustomization } from './is-email-customization';

export function getEmailCustomizationState (
  customizations: Customization[],
  customizationState: CustomizationStateItem[]
): CustomizationStateItem | undefined {
  const emailCustomization = customizations.find(isEmailCustomization);

  if (!emailCustomization) {
    return;
  }

  return customizationState.find((item) => item.customizationId === emailCustomization.id);
}
