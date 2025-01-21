import get from 'lodash-es/get'
import { Store } from 'vuex'
import { BundleOptionsProductLink, SelectedBundleOption } from '@vue-storefront/core/modules/catalog/types/BundleOption';
import { getBundleOptionsValues, getDefaultBundleOptions } from '@vue-storefront/core/modules/catalog/helpers/bundleOptions';
import Product from '@vue-storefront/core/modules/catalog/types/Product';
import RootState from '@vue-storefront/core/types/RootState'
import { getOptionValueSpecialPrice, getSelectedOptionValuesByCustomizationState, OptionValue } from 'src/modules/customization-system';
import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';

function getBundleOptionDiscountPrice (bundleOptionValues: BundleOptionsProductLink[], store: Store<RootState>): number | undefined {
  let isDiscounted = false;

  const price = bundleOptionValues.map((optionValue) => {
    const product = optionValue.product;

    if (!product) {
      return optionValue.price || 0;
    }

    const productPrice = store.getters['promotionPlatform/getProductCampaignDiscountPrice'](product);

    if (productPrice) {
      isDiscounted = true;
    }

    return productPrice || product.special_price_incl_tax || product.priceInclTax || product.price_incl_tax || 0;
  }).reduce((productPrice, totalPrice) => (totalPrice + productPrice), 0);

  if (!isDiscounted || !price) {
    return;
  }

  return price;
}

function getOptionValuesDiscountPrice (
  optionValues: OptionValue[],
  store: Store<RootState>
): number | undefined {
  let isDiscounted = false;
  let price = 0;

  for (const optionValue of optionValues) {
    if (!optionValue.price || !optionValue.productId) {
      continue;
    }

    const productPrice = store.getters['promotionPlatform/getProductCampaignDiscountPrice'](
      {
        id: optionValue.productId
      }
    );
    const optionValueSpecialPrice = getOptionValueSpecialPrice(optionValue);

    if (productPrice !== undefined) {
      isDiscounted = true;
      price += productPrice;
      continue;
    }

    if (optionValueSpecialPrice !== null) {
      price += optionValueSpecialPrice;
      continue;
    }

    price += optionValue.price || 0;
  }

  if (!isDiscounted) {
    return;
  }

  return price;
}

function getBundleCartItemWithoutCustomizationsDiscountPrice (
  cartItem: CartItem,
  store: Store<RootState>
): number | undefined {
  const allBundleOptions = cartItem.bundle_options || [];

  const selectedBundleOptions = Object.values(get(cartItem, 'product_option.extension_attributes.bundle_options', {}));
  const bundleOptionsValues = getBundleOptionsValues(selectedBundleOptions as SelectedBundleOption[], allBundleOptions);

  return getBundleOptionDiscountPrice(bundleOptionsValues, store);
}

export function getBundleCartItemDiscountPrice (
  cartItem: CartItem,
  store: Store<RootState>
): number | undefined {
  if (!cartItem.customizations || !cartItem.extension_attributes?.customization_state) {
    return getBundleCartItemWithoutCustomizationsDiscountPrice(cartItem, store);
  }

  const selectedOptionValues = getSelectedOptionValuesByCustomizationState(
    cartItem.extension_attributes.customization_state,
    cartItem.customizations
  );

  return getOptionValuesDiscountPrice(selectedOptionValues, store);
}

export function getBundleProductDefaultDiscountPrice (product: Product, store: Store<RootState>): number | undefined {
  const allBundleOptions = product.bundle_options || [];

  const defaultBundleOptions = getDefaultBundleOptions(product);
  const bundleOptionsValues = getBundleOptionsValues(defaultBundleOptions as SelectedBundleOption[], allBundleOptions);

  return getBundleOptionDiscountPrice(bundleOptionsValues, store);
}
