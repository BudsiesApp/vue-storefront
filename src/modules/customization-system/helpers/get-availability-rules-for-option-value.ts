import { AvailabilityRules } from '../types/availability-rules.interface';
import { OptionValue } from '../types/option-value.interface';
import { PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID } from '../types/production-time-selector-standard-option-value-id';

const sneakPeekOptionValuesSkus = [
  'sneak_peek',
  'golf_cover_sneak_peek',
  'bulk_sample_sneak_peek',
  'specialty_commission_sneak_peek'
];

export function getAvailabilityRulesForOptionValue (
  optionValue: OptionValue,
  isProductionTimeCustomizationAvailable: boolean
): AvailabilityRules | undefined {
  const availabilityRules = optionValue.availabilityRules;

  if (!optionValue.sku || !sneakPeekOptionValuesSkus.includes(optionValue.sku)) {
    return availabilityRules;
  }

  if (!isProductionTimeCustomizationAvailable) {
    return availabilityRules;
  }

  if (!availabilityRules?.forActivatedOptionValueIds) {
    return {
      forActivatedOptionValueIds: [PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID]
    }
  }

  return {
    forActivatedOptionValueIds: [
      ...availabilityRules.forActivatedOptionValueIds,
      PRODUCTION_TIME_SELECTOR_STANDARD_OPTION_VALUE_ID
    ]
  };
}
