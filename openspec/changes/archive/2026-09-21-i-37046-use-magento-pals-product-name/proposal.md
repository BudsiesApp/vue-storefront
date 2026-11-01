## Why

The `/sponsors/` purchase flow displays legacy storefront-owned "Budsies Pals Kit" labels even though Magento now names the product "Budsies Pals Vouchers." Using the loaded catalog product name as the source of truth keeps the purchase flow aligned with future Magento name changes without requiring a storefront deployment or Storyblok edit.

## What Changes

- Display the loaded Magento product name in each application-controlled product-name heading in the Budsies Pals purchase flow.
- Build the purchase heading without the legacy singular article or hard-coded "Kit" wording so plural or otherwise renamed product names read naturally.
- Remove obsolete storefront translation entries used only for the replaced hard-coded product-name headings.
- Add regression coverage proving Magento name changes appear in both headings while the existing organization, quantity, and add-to-cart flow remains unchanged.
- Leave independently managed Storyblok marketing content, product identifiers, URLs, fulfillment, reporting, and integrations unchanged.

## Capabilities

### New Capabilities

- `catalog-product-name-presentation`: Defines how application-controlled purchase-flow labels use the authoritative Magento catalog product name.

### Modified Capabilities

None.

## Impact

- Affected page: `src/themes/petsies-capybara/pages/BudsiesPalsKitProduct.vue`.
- Affected localization data: obsolete heading keys in `src/themes/petsies-capybara/resource/i18n/en-US.csv`.
- Affected tests: focused page/component coverage for product-name presentation and preserved purchase behavior.
- No API, catalog identifier, route, Storyblok content, dependency, order-data, reporting, or integration changes.