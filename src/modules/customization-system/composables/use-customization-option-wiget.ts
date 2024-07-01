import { computed, onBeforeUnmount, Ref, SetupContext, watch } from '@vue/composition-api';

import { PRODUCT_SET_BUNDLE_OPTION } from '@vue-storefront/core/modules/catalog/store/product/mutation-types';

import { CustomizationOptionValue } from '../types/customization-option-value';
import { Customization } from '../types/customization.interface';
import { OptionType } from '../types/option-type';
import { OptionValue } from '../types/option-value.interface';
import { WidgetType } from '../types/widget-type';
import { isFileUploadValue } from '../types/is-file-upload-value.typeguard';

export function useCustomizationOptionWidget (
  value: Ref<CustomizationOptionValue>,
  customization: Ref<Customization>,
  values: Ref<OptionValue[]>,
  productId: Ref<number>,
  { emit, root }: SetupContext
) {
  const selectedOption = computed<CustomizationOptionValue>({
    get: () => {
      return value.value;
    },
    set: (newValue: CustomizationOptionValue) => {
      emit('input', {
        customizationId: customization.value.id,
        value: newValue
      });
    }
  });
  const maxValuesCount = computed<number | undefined>(() => {
    if (!customization.value.optionData) {
      throw new Error("Customization 'optionData' is missing");
    }

    return customization.value.optionData.maxValuesCount;
  });
  const widget = computed<{
    component: string,
    props?: Record<string, any>
  }>(() => {
    if (!customization.value.optionData) {
      throw new Error("Customization 'optionData' is missing");
    }

    const isRequired = customization.value.optionData.isRequired;

    const widgetOptions = customization.value.optionData.displayWidgetOptions;
    const displayWidget = customization.value.optionData.displayWidget;

    if (customization.value.optionData.type === OptionType.PRODUCTION_TIME) {
      return {
        component: 'ProductionTimeSelector',
        props: {
          bundleOptionId: customization.value.bundleOptionId,
          isRequired,
          placeholder: widgetOptions?.placeholder,
          productId: productId.value,
          values: values.value
        }
      };
    }

    const listWidgetsProps = {
      alignment: widgetOptions?.alignment,
      isRequired,
      maxValuesCount: maxValuesCount.value,
      shape: widgetOptions?.shape,
      values: values.value
    };

    switch (displayWidget) {
      case WidgetType.CARDS_LIST:
        return {
          component: 'CardsListWidget',
          props: {
            isRequired,
            maxValuesCount: maxValuesCount.value,
            values: values.value
          }
        };
      case WidgetType.CHECKBOX:
        return {
          component: 'CheckboxWidget',
          props: {
            isRequired,
            label: customization.value.title || customization.value.name,
            values: values.value
          }
        };
      case WidgetType.COLORS_LIST:
        return {
          component: 'ColorsListWidget',
          props: listWidgetsProps
        };
      case WidgetType.DROPDOWN:
        return {
          component: 'DropdownWidget',
          props: {
            isRequired,
            values: values.value,
            placeholder: widgetOptions?.placeholder
          }
        };
      case WidgetType.IMAGE_UPLOAD:
        return {
          component: 'ImageUploadWidget',
          props: {
            maxValuesCount: maxValuesCount.value,
            productId: productId.value
          }
        };
      case WidgetType.SEARCH_FIELD:
        return {
          component: 'SearchFieldWidget',
          props: {
            isRequired,
            values: values.value,
            placeholder: widgetOptions?.placeholder
          }
        };
      case WidgetType.TEXT_AREA:
        return {
          component: 'TextAreaWidget',
          props: {
            placeholder: widgetOptions?.placeholder
          }
        };
      case WidgetType.TEXT_INPUT:
        return {
          component: 'TextInputWidget',
          props: {
            placeholder: widgetOptions?.placeholder
          }
        };
      case WidgetType.THUMBNAILS_LIST:
        return {
          component: 'ThumbnailsListWidget',
          props: listWidgetsProps
        };
    }
  });

  function setBundleOptionValue (
    optionId: number,
    optionQty: number,
    optionSelections: number[]
  ): void {
    root.$store.commit(
      `product/${PRODUCT_SET_BUNDLE_OPTION}`,
      { optionId, optionQty, optionSelections }
    )
  }

  watch(
    selectedOption,
    (newValue) => {
      if (!customization.value.bundleOptionId) {
        return;
      }

      if (isFileUploadValue(newValue)) {
        return;
      }

      let selectedValueIds: string[]

      if (!newValue) {
        selectedValueIds = [];
      } else {
        selectedValueIds = Array.isArray(newValue) ? newValue : [newValue];
      }

      const bundleOptionItemIds: number[] = [];

      selectedValueIds.forEach((id) => {
        const value = values.value.find((item) => item.id === id);

        if (value && value.bundleOptionItemId) {
          bundleOptionItemIds.push(value.bundleOptionItemId)
        }
      })

      setBundleOptionValue(
        customization.value.bundleOptionId,
        1,
        bundleOptionItemIds
      )
    },
    {
      immediate: true
    }
  );

  return {
    maxValuesCount,
    selectedOption,
    widget
  }
}
