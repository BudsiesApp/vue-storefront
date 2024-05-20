import { computed, Ref, ref, watch } from '@vue/composition-api';
import { extend } from 'vee-validate';
import { required } from 'vee-validate/dist/rules';
import { ValidationRuleSchema } from 'vee-validate/dist/types/types'

import { getFieldAnchorName } from 'theme/helpers/use-form-validation';

import { Customization } from '../types/customization.interface';

extend('required', {
  ...required,
  message: 'The \'{_field_}\' field is required'
});

export function useCustomizationOptionValidation (customization: Ref<Customization>) {
  const validationRef = computed<string>(() => {
    const customizationValue = customization.value;
    return getFieldAnchorName(customizationValue.title || customizationValue.name);
  });
  const validationRules = computed<Record<string, any>>(() => {
    const maxValueCount = customization.value.optionData?.maxValuesCount;
    return {
      required: customization.value.optionData?.isRequired,
      maxValueCount: maxValueCount &&
        maxValueCount > 1
        ? {
          max: maxValueCount
        }
        : false
    }
  });
  const validatedValue = ref<string | string[] | undefined>();

  const maxValueCountValidationRule = computed<ValidationRuleSchema>(() => {
    return {
      validate: (
        value: string | string[] | undefined,
        params: any
      ): boolean => {
        validatedValue.value = value;

        if (!params) {
          return true;
        }

        if (!value) {
          return true;
        }

        return value.length <= params.max;
      },
      params: ['max'],
      message: (
        field: string,
        params: Record<string, any>
      ): string => {
        if (!validatedValue.value || !params?.max) {
          return '';
        }

        if (Array.isArray(validatedValue.value)) {
          return `Maximum count for '${field}' is ${params.max}`;
        }

        return `'${field}' maximum length is ${params.max}`;
      }
    }
  });

  function extendMaxValueCountValidationRule (): void {
    extend('maxValueCount', maxValueCountValidationRule.value);
  }

  extendMaxValueCountValidationRule();

  watch(
    maxValueCountValidationRule,
    () => extendMaxValueCountValidationRule
  );

  return {
    validationRef,
    validationRules
  }
}
