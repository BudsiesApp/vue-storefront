<template>
  <div class="customization-option">
    <label
      for=""
      class="_option-label"
      :ref="validationRef"
    >
      {{ customizationLabel }}
    </label>

    <validation-provider
      slim
      v-slot="{ errors }"
      :rules="validationRules"
      :name="customization.name"
    >
      <component
        :is="widgetComponent"
        :error="errors[0]"
        :values="optionValues"
        v-model="selectedOption"
      />
    </validation-provider>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from '@vue/composition-api';
import { extend, ValidationProvider } from 'vee-validate';
import { required } from 'vee-validate/dist/rules';

import { Customization } from '../types/customization.interface';
import { CustomizationStateItem } from '../types/customization-state-item.interface';
import { OptionValue } from '../types/option-value.interface';
import { getFieldAnchorName } from 'theme/helpers/use-form-validation';
import { WidgetType } from '../types/widget-type';

extend('required', {
  ...required,
  message: 'The {_field_} field is required'
});

export default defineComponent({
  name: 'CustomizationOption',
  components: {
    ValidationProvider
  },
  props: {
    customization: {
      type: Object as PropType<Customization>,
      required: true
    },
    selectedOptionValuesIds: {
      type: Array as PropType<string[]>,
      default: () => ({})
    },
    value: {
      type: Object as PropType<CustomizationStateItem | undefined>,
      default: undefined
    }
  },
  setup (props, context) {
    const { customization, selectedOptionValuesIds } = toRefs(props);

    // TODO: split for a separate composables
    const customizationLabel = computed<string>(() => {
      return customization.value.title || customization.value.name;
    });

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
        return props.value?.value
      },
      set: (newValue: string | string[] | undefined) => {
        context.emit('input', {
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

    const validationRef = computed<string>(() => {
      return getFieldAnchorName(customizationLabel.value);
    });
    const validationRules = computed<Record<string, any>>(() => {
      return {
        required: customization.value.optionData?.isRequired
        // max:
      }
    });

    return {
      customizationLabel,
      optionValues,
      selectedOption,
      validationRef,
      validationRules,
      widgetComponent
    }
  }
})
</script>
