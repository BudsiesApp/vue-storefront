## 1. Product Name Presentation

- [x] 1.1 Update the `/sponsors/` page heading to render only when the validated current product is available and to display that product's Magento name; verify a focused component test renders `Budsies Pals Vouchers` and a different supplied catalog name without a legacy fallback.
- [x] 1.2 Update the purchase heading to combine the localized `Purchase` command with the same Magento product name, without a singular article or hard-coded `Kit`/`Kits`; verify the focused component test renders `Purchase Budsies Pals Vouchers`.
- [x] 1.3 Preserve the existing product object passed to the Budsies Pals order-form component; verify the focused component test asserts the form receives the same current product after heading rendering changes.

## 2. Localization Cleanup

- [x] 2.1 Search the repository for the exact `Budsies Pals Kit` and `Purchase a Budsies Pals Kit` i18n keys, remove only entries with no remaining consumers, run `yarn update-i18n-files`, and verify independently managed Storyblok marketing text remains unchanged.

## 3. Validation

- [x] 3.1 Run the focused Jest spec for `BudsiesPalsKitProduct.vue` and verify catalog-name presentation, neutral purchase wording, and order-form product propagation pass.
- [x] 3.2 Run `yarn type-check` and `yarn lint` and verify the changed Vue, test, and localization surfaces introduce no errors.
- [x] 3.3 Run `yarn test:unit:maintained` and verify the maintained unit suite passes without regressions to organization selection, quantity selection, or cart behavior.