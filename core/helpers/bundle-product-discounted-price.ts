import type CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import type Product from '@vue-storefront/core/modules/catalog/types/Product';
import type { ProductDiscountedPrice } from '@vue-storefront/core/modules/catalog';
import { getSelectedOptionValuesByCustomizationState } from 'src/modules/customization-system/helpers/get-selected-options-values-by-customization-state';
import { getOptionValuePrice } from 'src/modules/customization-system/helpers/get-option-value-price';
import type { OptionValue } from 'src/modules/customization-system/types/option-value.interface';

import { getFinalPrice } from './price';

function getBundleOptionDiscountedPrice (
  values: (OptionValue & { quantity: number })[],
  productDiscountedPrice: Record<string, ProductDiscountedPrice>
): ProductDiscountedPrice | undefined {
  const total: ProductDiscountedPrice = { regular: 0, final: 0 };
  let isDiscounted = false;

  for (const value of values) {
    if (value.price == null) continue;

    if (value.productId != null && productDiscountedPrice[value.productId]) {
      isDiscounted = true;
    }

    const price = getOptionValuePrice(value, productDiscountedPrice);
    total.regular += price.regular * value.quantity;
    total.final += getFinalPrice(price) * value.quantity;
  }

  return isDiscounted ? total : undefined;
}

export function getBundleCartItemDiscountedPrice (
  product: Product,
  productDiscountedPrice: Record<string, ProductDiscountedPrice>
): ProductDiscountedPrice | undefined {
  const customizationState = (product as CartItem).extension_attributes?.customization_state || [];
  const values = getSelectedOptionValuesByCustomizationState(customizationState, product.customizations);

  return getBundleOptionDiscountedPrice(values, productDiscountedPrice);
}

export function getBundleProductDefaultDiscountedPrice (
  product: Product,
  productDiscountedPrice: Record<string, ProductDiscountedPrice>
): ProductDiscountedPrice | undefined {
  const values: (OptionValue & { quantity: number })[] = [];

  for (const customization of product.customizations || []) {
    if (!customization.isEnabled || !customization.optionData?.isRequired) continue;

    const optionValues = customization.optionData.values || [];
    let defaultValue = optionValues.find(value => value.isDefault);

    if (!defaultValue) {
      let lowestPrice: number | undefined;

      for (const value of optionValues) {
        if (!value.isEnabled || value.price == null) continue;

        const price = getFinalPrice(getOptionValuePrice(value, productDiscountedPrice));
        if (lowestPrice === undefined || price < lowestPrice) {
          lowestPrice = price;
          defaultValue = value;
        }
      }
    }

    if (!defaultValue) continue;

    values.push({ ...defaultValue, quantity: 1 });
  }

  return getBundleOptionDiscountedPrice(values, productDiscountedPrice);
}
