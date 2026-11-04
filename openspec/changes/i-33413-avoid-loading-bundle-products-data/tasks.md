# Tasks

## 1. Pricing

- [x] 1.1 Resolve option regular and effective prices from existing option metadata, special-price dates, campaign adjustments, and the active exchange rate.
- [x] 1.2 Use the option resolver for widgets, lowest-price selection, customization totals, and cart configuration descriptions without reading loaded child products.
- [x] 1.3 Replace child-product prices in the bundle discount and ordinary cart calculators with customization prices; retain the existing helper names, delegation, campaign-match return rule, default catalog-price reader, and final pricing flow. Use explicit defaults with a lowest-effective-price fallback for required customizations.
- [x] 1.4 Keep existing product-price dictionaries for actual products and bundle parents, including rich-text price directives; do not insert unloaded child IDs or mutate prices in loaders.

## 2. Loading

- [x] 2.1 Pass the existing prefetch preference through single-product actions and resolver calls, including cached products, while retaining its enabled default.
- [x] 2.2 Disable prefetch in single-product, multi-product, and wizard creation-page loaders.
- [x] 2.3 Retain cart synchronization and server-item restoration with child-product prefetching, refreshed bundle links, and the existing child-stock quantity-selector behavior.
- [x] 2.4 Disable child-product prefetching in the rich-text directive product loader while retaining reuse of loaded parent products.

## 3. Checks

- [x] 3.1 Run TypeScript, lint, diff checks, and strict OpenSpec validation.
