import get from 'lodash-es/get'
import { BundleOptionsProductLink, SelectedBundleOption } from '@vue-storefront/core/modules/catalog/types/BundleOption';
import { getBundleOptionsValues, getDefaultBundleOptions } from '@vue-storefront/core/modules/catalog/helpers/bundleOptions';
import Product from '@vue-storefront/core/modules/catalog/types/Product';
import { ProductDiscountedPrice } from '@vue-storefront/core/modules/catalog';

function getCampaignAmount (value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getSelectionQuantity (qty: number | string | undefined): number {
  const quantity = typeof qty === 'string' ? Number(qty) : qty;

  return typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getBundleOptionDiscountedPrice (
  bundleOptionValues: BundleOptionsProductLink[],
  productDiscountedPrice: Record<string, ProductDiscountedPrice>
): ProductDiscountedPrice | undefined {
  let isDiscounted = false;

  const price = bundleOptionValues.map((optionValue) => {
    const product = optionValue.product;
    const quantity = getSelectionQuantity(optionValue.qty);

    if (!product || !product.id) {
      return {
        regular: (optionValue.price || 0) * quantity,
        final: (optionValue.price || 0) * quantity
      };
    }

    const productPrice = productDiscountedPrice[product.id];

    if (productPrice) {
      isDiscounted = true;
    }

    const final = getCampaignAmount(productPrice?.final) ??
      (product.special_price_incl_tax ||
      product.priceInclTax ||
      product.price_incl_tax ||
      0);
    const regular = getCampaignAmount(productPrice?.regular) ??
      (product.original_price_incl_tax ||
      product.priceInclTax ||
      product.price_incl_tax ||
      0);

    return {
      final: final * quantity,
      regular: regular * quantity
    };
  }).reduce((productPrice, totalPrice) => {
    return {
      regular: totalPrice.regular + productPrice.regular,
      final: totalPrice.final + productPrice.final
    }
  }, { regular: 0, final: 0 });

  if (!isDiscounted || !price) {
    return;
  }

  return price;
}

export function getBundleCartItemDiscountedPrice (
  product: Product,
  productDiscountedPrice: Record<string, ProductDiscountedPrice>
): ProductDiscountedPrice | undefined {
  const allBundleOptions = product.bundle_options || [];

  const selectedBundleOptions = Object.values(
    get(
      product,
      'product_option.extension_attributes.bundle_options',
      {}
    )
  );
  const bundleOptionsValues = getBundleOptionsValues(
    selectedBundleOptions as SelectedBundleOption[],
    allBundleOptions
  );

  return getBundleOptionDiscountedPrice(bundleOptionsValues, productDiscountedPrice);
}

export function getBundleProductDefaultDiscountedPrice (
  product: Product,
  productDiscountedPrice: Record<string, ProductDiscountedPrice>
): ProductDiscountedPrice | undefined {
  const allBundleOptions = product.bundle_options || [];

  const defaultBundleOptions = getDefaultBundleOptions(product);
  const bundleOptionsValues = getBundleOptionsValues(
    defaultBundleOptions as SelectedBundleOption[],
    allBundleOptions
  );

  return getBundleOptionDiscountedPrice(bundleOptionsValues, productDiscountedPrice);
}
