import { computed, onBeforeUnmount, Ref, SetupContext, watch } from '@vue/composition-api';

import { PRODUCT_SET_BUNDLE_OPTION } from '@vue-storefront/core/modules/catalog/store/product/mutation-types';

import { CustomizationStateItem } from '../types/customization-state-item.interface';
import { Customization } from '../types/customization.interface';
import { OptionType } from '../types/option-type';
import { WidgetType } from '../types/widget-type';
import { OptionValue } from '..';

export function useCustomizationOptionWidget (
  value: Ref<CustomizationStateItem | undefined>,
  customization: Ref<Customization>,
  values: Ref<OptionValue[]>,
  productId: Ref<number>,
  { emit, root }: SetupContext
) {
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

    if (customization.value.optionData.type === OptionType.PRODUCTION_TIME) {
      return {
        component: 'ProductionTimeSelector',
        props: {
          bundleOptionId: customization.value.bundleOptionId,
          productId: productId.value,
          values: values.value
        }
      };
    }

    const widgetConfig = customization.value.optionData.widgetConfig;
    const displayWidget = customization.value.optionData.displayWidget;

    const listWidgetsProps = {
      layout: widgetConfig?.layout,
      maxValuesCount: maxValuesCount.value,
      shape: widgetConfig?.shape,
      values: values.value
    };

    switch (displayWidget) {
      case WidgetType.CARDS_LIST:
        return {
          component: 'CardsListWidget',
          props: {
            maxValuesCount: maxValuesCount.value,
            values: values.value
          }
        };
      case WidgetType.CHECKBOX:
        return {
          component: 'CheckboxWidget',
          props: {
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
            values: values.value,
            placeholder: widgetConfig?.placeholder
          }
        };
      case WidgetType.DROPDOWN_FREE_TEXT:
        return {
          component: 'DropdownFreeTextWidget',
          props: {
            values: values.value,
            placeholder: widgetConfig?.placeholder
          }
        };
      case WidgetType.IMAGE_UPLOAD:
      case WidgetType.IMAGE_UPLOAD_LATER:
        return {
          component: 'ImageUploadWidget',
          props: {
            allowUploadLater: displayWidget === WidgetType.IMAGE_UPLOAD_LATER,
            maxValuesCount: maxValuesCount.value,
            productId: productId.value
          }
        };
      case WidgetType.TEXT_AREA:
        return {
          component: 'TextAreaWidget',
          props: {
            placeholder: widgetConfig?.placeholder
          }
        };
      case WidgetType.TEXT_INPUT:
        return {
          component: 'TextInputWidget',
          props: {
            placeholder: widgetConfig?.placeholder
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

  onBeforeUnmount(() => {
    selectedOption.value = undefined;
  });

  // watch(values, (newValue) => {
  //   if (!selectedOption.value) {
  //     return;
  //   }

  // });

  watch(selectedOption, (newValue) => {
    if (!customization.value.bundleOptionId) {
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
  });

  return {
    maxValuesCount,
    selectedOption,
    widget
  }
}
