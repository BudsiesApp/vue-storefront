import { computed, Ref, SetupContext, watch } from '@vue/composition-api';
import { CustomizationOptionValue } from '../types/customization-option-value';

import { Customization } from '../types/customization.interface';
import { isFileUploadValue } from '../types/is-file-upload-value.typeguard';
import { OptionValue } from '../types/option-value.interface';

export function useSelectedOptionValueUrlQuery (
  availableCustomizationDictionary: Ref<Record<string, Customization>>,
  availableOptionValues: Ref<OptionValue[]>,
  customizationOptionValue: Ref<Record<string, CustomizationOptionValue>>,
  updateCustomizationOptionValue: (payload: { customizationId: string, value: CustomizationOptionValue }) => void,
  { root }: SetupContext
) {
  const showInUrlQueryCustomizations = computed<Customization[]>(() => {
    const customizations: Customization[] = [];

    // TODO: temporary - current TS version don't handle `value` type right in this case
    for (const customization of Object.values((availableCustomizationDictionary as any).value)) {
      if ((customization as Customization).optionData?.showInUrlQuery) {
        customizations.push((customization as Customization));
      }
    }

    return customizations;
  });

  const availableOptionValueDictionary = computed<Record<string, OptionValue>>(() => {
    const dictionary: Record<string, OptionValue> = {};

    for (const optionValue of availableOptionValues.value) {
      dictionary[optionValue.id] = optionValue;
    }

    return dictionary;
  });
  const showInUrlQueryData = computed<Record<string, string | null | string[]>>(() => {
    const dictionary: Record<string, string | null | string[]> = {};

    for (const customization of showInUrlQueryCustomizations.value) {
      if (!customization.optionData?.sku) {
        continue;
      }

      const selectedValue = customizationOptionValue.value[customization.id];

      if (!selectedValue || isFileUploadValue(selectedValue)) {
        dictionary[customization.optionData.sku] = null;
        continue;
      }

      const optionValuesIds = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
      const optionValuesSkus: string[] = [];

      for (const id of optionValuesIds) {
        const optionValueSku = availableOptionValueDictionary.value[id]?.sku;

        if (optionValueSku) {
          optionValuesSkus.push(optionValueSku);
        }
      }

      if (optionValuesSkus.length === 0) {
        dictionary[customization.optionData.sku] = null;
        continue;
      }

      if (optionValuesSkus.length === 1) {
        dictionary[customization.optionData.sku] = optionValuesSkus[0];
        continue;
      }

      dictionary[customization.optionData.sku] = optionValuesSkus;
    }

    return dictionary;
  });

  function updateCustomizationOptionValueFromQuery (): void {
    for (const customization of showInUrlQueryCustomizations.value) {
      if (!customization.optionData?.sku) {
        continue;
      }

      const selectedValuesSkus = root.$route.query[customization.optionData?.sku];

      if (!selectedValuesSkus) {
        continue;
      }

      const relatedOptionValues: OptionValue[] = [];

      for (const sku of Array.isArray(selectedValuesSkus) ? selectedValuesSkus : [selectedValuesSkus]) {
        if (sku === null) {
          continue;
        }

        const optionValue = customization.optionData.values?.find((value) => value.sku === sku);

        if (optionValue && !!availableOptionValueDictionary.value[optionValue.id]) {
          relatedOptionValues.push(optionValue);
        }
      }

      updateCustomizationOptionValue({
        customizationId: customization.id,
        value: relatedOptionValues.length > 1 ? relatedOptionValues.map((item) => item.id) : relatedOptionValues[0].id
      });
    }
  }

  updateCustomizationOptionValueFromQuery();

  watch(showInUrlQueryData, () => {
    root.$router.push({ query: { ...root.$route.query, ...showInUrlQueryData.value } });
  });
}
