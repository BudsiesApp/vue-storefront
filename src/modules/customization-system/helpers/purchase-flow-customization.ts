import { ProductPurchaseFlow } from 'src/modules/shared';

import { Customization } from '../types/customization.interface';
import { OptionValue } from '../types/option-value.interface';

const FLOW_CUSTOMIZATION_NAME = 'purchase flow';

const flowToOptionValueName: Record<ProductPurchaseFlow, string> = {
  [ProductPurchaseFlow.CUSTOMIZE_NOW]: 'customize now',
  [ProductPurchaseFlow.CUSTOMIZE_LATER]: 'customize later'
};

function normalizeName (value?: string): string {
  return (value || '').trim().toLowerCase();
}

export function findPurchaseFlowCustomization (
  customizations: Customization[]
): Customization | undefined {
  return customizations.find((customization) => {
    return normalizeName(customization.name) === FLOW_CUSTOMIZATION_NAME;
  });
}

export function findPurchaseFlowOptionValue (
  flowCustomization: Customization,
  flow: ProductPurchaseFlow
): OptionValue | undefined {
  const expectedName = flowToOptionValueName[flow];

  return flowCustomization.optionData?.values?.find((optionValue) => {
    return normalizeName(optionValue.name) === expectedName;
  });
}
