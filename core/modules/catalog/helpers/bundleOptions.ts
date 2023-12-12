import { getProductLinkPrice } from './associatedProducts/getProductLinkPrice';
import get from 'lodash-es/get'
import Product, { ProductOptions } from '@vue-storefront/core/modules/catalog/types/Product';
import { BundleOption, BundleOptionsProductLink, SelectedBundleOption } from '@vue-storefront/core/modules/catalog/types/BundleOption';

export const getBundleOptionPrice = (bundleOptionValues: BundleOptionsProductLink[]) => getProductLinkPrice(bundleOptionValues)

export const getBundleOptionsValues = (selectedBundleOptions: SelectedBundleOption[], allBundeOptions: BundleOption[]): BundleOptionsProductLink[] => selectedBundleOptions
  .map(selectedBundleOption => {
    const {
      product_links: productLinks = []
    } = allBundeOptions.find(bundleOption => bundleOption.option_id === selectedBundleOption.option_id) || {}
    const selectedBundleOptionProductLinks = productLinks.filter(
      productLink => selectedBundleOption.option_selections
        .some((item) => String(productLink.id) === String(item))
    )

    return selectedBundleOptionProductLinks.map((selectedBundleOptionProductLink) => ({
      ...selectedBundleOptionProductLink,
      qty: selectedBundleOption.option_qty
    }))
  }).reduce(
    (selectedBundleOptionsProductLinksFlattedArray, selectedBundleOptionProductLinks) =>
      selectedBundleOptionsProductLinksFlattedArray.concat(selectedBundleOptionProductLinks),
    []
  );

export const getSelectedBundleOptions = (product: Product): SelectedBundleOption[] => {
  const selectedBundleOptions = Object.values(get(product, 'product_option.extension_attributes.bundle_options', {}))
  if (selectedBundleOptions.length) {
    return selectedBundleOptions as any as SelectedBundleOption[]
  }

  // get default options
  const allBundeOptions = product.bundle_options || []
  return allBundeOptions.map((bundleOption) => {
    const productLinks = bundleOption.product_links || []
    const defaultLink = productLinks.find((productLink) => productLink.is_default) || productLinks[0]
    const qty = (typeof defaultLink.qty === 'string' ? parseInt(defaultLink.qty) : defaultLink.qty) || 1
    return {
      option_id: bundleOption.option_id,
      option_qty: qty,
      option_selections: [Number(defaultLink.id)]
    }
  })
}

export const getDefaultBundleOptions = (product: Product): SelectedBundleOption[] => {
  const allBundleOptions: BundleOption[] = product.bundle_options || [];

  const requiredBundleOptions = allBundleOptions.filter((option) => option.required);

  return requiredBundleOptions.map((bundleOption) => {
    const productLinks = bundleOption.product_links || []
    const defaultLink = productLinks.find((productLink) => productLink.is_default) || productLinks[0]
    const qty = (typeof defaultLink.qty === 'string' ? parseInt(defaultLink.qty) : defaultLink.qty) || 1
    return {
      option_id: bundleOption.option_id,
      option_qty: qty,
      option_selections: [Number(defaultLink.id)]
    }
  });
}

export const getDefaultProductLinkForRequiredBundleOptionsDictionary = (
  product: Product
): Record<string, BundleOptionsProductLink> => {
  const allBundleOptions: BundleOption[] = product.bundle_options || [];
  const requiredBundleOptions = allBundleOptions.filter((option) => option.required);
  const dictionary: Record<string, BundleOptionsProductLink> = {};

  for (const bundleOption of requiredBundleOptions) {
    const productLinks = bundleOption.product_links || [];
    const defaultLink = productLinks.find((productLink) => productLink.is_default) || productLinks[0];

    if (!defaultLink) {
      continue;
    }

    dictionary[bundleOption.option_id] = defaultLink;
  }

  return dictionary;
}

export const getDefaultProductLinkFromBundleOption = (
  bundleOption: BundleOption
): BundleOptionsProductLink | undefined => {
  return bundleOption.product_links.find((productLink) => {
    return productLink.is_default;
  })
}

export const getSelectedProductLinkFromBundleOption = (
  bundleOption: BundleOption,
  productOptions: ProductOptions
): BundleOptionsProductLink | undefined => {
  const selectedBundleOption = productOptions.extension_attributes.bundle_options[bundleOption.option_id];

  if (!selectedBundleOption) {
    return;
  }

  return bundleOption.product_links.find((productLink) =>
    productLink.id.toString() === selectedBundleOption.option_selections[0].toString()
  );
}
