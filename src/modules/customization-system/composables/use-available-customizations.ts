import { Ref, ComputedRef, computed } from '@vue/composition-api';

import { Customization, CustomizationStateItem, OptionValue } from '..';
import { isItemAvailable } from '../helpers/is-item-available';
import { WidgetType } from '../types/widget-type';

const ignoreAvailableOptionsCheckFor = [
  WidgetType.CHECKBOX,
  WidgetType.IMAGE_UPLOAD,
  WidgetType.IMAGE_UPLOAD_LATER,
  WidgetType.TEXT_AREA,
  WidgetType.TEXT_INPUT
]

export function useAvailableCustomizations (
  customizations: Ref<Customization[]>,
  selectedOptionValuesIds: ComputedRef<string[]>
) {
  const customizationAvailableOptionValues = computed<Record<string, OptionValue[]>>(
    () => {
      const dictionary: Record<string, OptionValue[]> = {};

      customizations.value.forEach((customization: Customization) => {
        dictionary[customization.id] =
          customization.optionData?.values.filter(
            (value) => {
              if (!value.isEnabled) {
                return false;
              }

              return isItemAvailable(value, selectedOptionValuesIds.value);
            }
          ) || [];
      });

      return dictionary;
    }
  );

  const availableCustomizations = computed<Customization[]>(() => {
    const filteredCustomizations: Customization[] = customizations.value.filter(
      (customization: Customization) => {
        if (!customization.isEnabled) {
          return false;
        }

        const hasAvailableOptionValues =
          customizationAvailableOptionValues.value[customization.id].length > 0 ||
          !customization.optionData ||
          ignoreAvailableOptionsCheckFor.includes(customization.optionData.displayWidget);

        return isItemAvailable(customization, selectedOptionValuesIds.value) &&
          hasAvailableOptionValues;
      }
    );

    return filteredCustomizations.sort((a, b) => {
      return a.sn > b.sn ? 1 : -1;
    });
  });

  return {
    availableCustomizations,
    customizationAvailableOptionValues
  }
}
