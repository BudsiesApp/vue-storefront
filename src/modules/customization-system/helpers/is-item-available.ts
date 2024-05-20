import { AvailabilityRules } from '../types/availability-rules.interface';

export function isItemAvailable (
  itemWithAvailabilityRules: {
    availabilityRules?: AvailabilityRules | undefined
  },
  selectedOptionValuesIds: string[]
) {
  const forActivatedOptionValueIds = itemWithAvailabilityRules.availabilityRules?.forActivatedOptionValueIds;

  if (
    !forActivatedOptionValueIds ||
    !forActivatedOptionValueIds.length
  ) {
    return true;
  }

  return forActivatedOptionValueIds.every((id) => {
    return selectedOptionValuesIds.includes(id);
  });
}
