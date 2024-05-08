import { computed, Ref, SetupContext } from '@vue/composition-api';
import { CustomizationStateItem } from '../types/customization-state-item.interface';

import { Customization } from '../types/customization.interface';
import { OptionValue } from '../types/option-value.interface';
import { WidgetType } from '../types/widget-type';

export function useCustomizationOptionWidget (
  value: Ref<CustomizationStateItem | undefined>,
  customization: Ref<Customization>,
  selectedOptionValuesIds: Ref<string[]>,
  { emit }: SetupContext
) {
  const optionValues = computed<OptionValue[]>(() => {
    return customization.value.optionData?.values.filter((value) => {
      const forActivatedOptionValueIds = value.availabilityRules?.forActivatedOptionValueIds;

      if (!forActivatedOptionValueIds || !forActivatedOptionValueIds.length) {
        return true;
      }

      return forActivatedOptionValueIds.every((id) => {
        return selectedOptionValuesIds.value.includes(id);
      })
    }) || [];
  });
  const selectedOption = computed<string | string[] | undefined>({
    get: () => {
      return value.value?.value
    },
    set: (newValue: string | string[] | undefined) => {
      emit('input', {
        customizationId: customization.value.id,
        value: newValue
      })
    }
  });
  const widgetComponent = computed<string>(() => {
    if (!customization.value.optionData) {
      throw new Error("Customization 'optionData' is missed");
    }

    switch (customization.value.optionData.displayWidget) {
      case WidgetType.CARDS_LIST:
        return 'CardsListWidget';
      case WidgetType.CHECKBOX:
        return 'CheckboxWidget';
      case WidgetType.COLORS_LIST:
        return 'ColorsListWidget';
      case WidgetType.DROPDOWN:
        return 'DropdownWidget';
      case WidgetType.DROPDOWN_FREE_TEXT:
        return 'DropdownFreeTextWidget';
      case WidgetType.IMAGE_UPLOAD:
        return 'ImageUploadWidget';
      case WidgetType.IMAGE_UPLOAD_LATER:
        return 'ImageUploadLaterWidget';
      case WidgetType.TEXT_AREA:
        return 'TextAreaWidget';
      case WidgetType.TEXT_INPUT:
        return 'TextInputWidget';
      case WidgetType.THUMBNAILS_LIST:
        return 'ThumbnailsListWidget';
    }
  });

  return {
    optionValues,
    selectedOption,
    widgetComponent
  }
}
