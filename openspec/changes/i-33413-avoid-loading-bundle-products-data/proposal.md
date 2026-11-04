# Proposal

## Why

Creation pages wait for an additional catalog request that loads bundle child products after the parent product is available. This delays the customization form even though the parent product's customization option values already contain the pricing data the form needs.

## What Changes

- Load creation-page parent products without prefetching their bundle child products.
- Load products referenced by rich-text price directives without prefetching their bundle children.
- Derive customization option regular and special prices from each option value, including the special-price validity window, and apply active promotional campaign prices by the option value's product ID.
- Preserve the existing price-selection, lowest-price, price-delta, and customization-total behavior while removing its dependency on bundle child products in the product store.
- Preserve bundle-parent catalog prices in the existing product-price dictionaries, including rich-text directives, and resolve discount overrides from required customization options.
- Retain cart synchronization's child-product loading and the existing quantity-selector behavior that reads child stock.
- Keep bundle option selection payloads based on `bundleOptionItemId` so add-to-cart behavior remains unchanged.

## Capabilities

### New Capabilities

- `creation-page-bundle-option-pricing`: Defines creation-page and rich-text directive loading without bundle child-product prefetching and pricing customization choices from embedded option-value data.

### Modified Capabilities

None.

## Impact

- Affects customization option-value types and price helpers/composables in `src/modules/customization-system`.
- Affects creation-page product loaders in `src/themes/petsies-capybara/helpers`, including single-product, multi-product, and creation-wizard product switching paths.
- Affects the product loader in `src/modules/shared/composables/use-text-directives.ts`.
- Affects the catalog single-product loading path in `core` only as needed to pass an explicit associated-product prefetch preference while retaining its existing default for other consumers.
- Replaces child-product price reads in the existing bundle discount and ordinary cart calculators while retaining the default catalog-price reader and final price calculation.
- Retains existing product dictionary membership rules; no child records or prices are fabricated to replace skipped creation-page requests.
- Requires no new backend endpoint; it combines pricing fields already present on customization option values with the campaign discount dictionary already held in catalog state.
