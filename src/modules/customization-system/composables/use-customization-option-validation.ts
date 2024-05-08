import { computed, Ref } from '@vue/composition-api';
import { getFieldAnchorName } from 'theme/helpers/use-form-validation';

import { Customization } from '../types/customization.interface';

export function useCustomizationOptionValidation (customization: Ref<Customization>) {
  const validationRef = computed<string>(() => {
    const customizationValue = customization.value;
    return getFieldAnchorName(customizationValue.title || customizationValue.name);
  });
  const validationRules = computed<Record<string, any>>(() => {
    return {
      required: customization.value.optionData?.isRequired
      // max:
    }
  });

  return {
    validationRef,
    validationRules
  }
}
