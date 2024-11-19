import { Customization } from '../types/customization.interface';

export function getCustomizationIdByOptionValueId (
  customizations: Customization[],
  optionValueId: string
): string | undefined {
  const customization = customizations.find((item) => {
    if (!item.optionData?.values) {
      return false;
    }

    return !!item.optionData.values.find((optionValue) => optionValue.id === optionValueId);
  });

  return customization?.id;
}
