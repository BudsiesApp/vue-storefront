# Tasks

All source paths below are relative to the app repository; `theme/` in the design means `src/themes/petsies-capybara/`, a separate git repository. Implementation belongs in that task branch and the app's customization-system module. These are future implementation tasks; proposal creation changes only `openspec/`.

## 1. Shared Display Restriction

- [x] 1.1 Add `src/modules/customization-system/helpers/is-image-upload-customization.ts` and export `isImageUploadCustomization()` through the module `index.ts`. Add `composables/use-awaiting-artwork-customizations-filter.ts` with the separate Awaiting-artwork filter specified in design decision 1, export it through the module `index.ts`, and leave `use-customizations-filter.ts` unchanged. Verify through the real filter in the page scenarios in 3.1 and 3.3.
- [x] 1.2 In `src/themes/petsies-capybara/components/customization-system/forms/creation-wizard-form.vue` and `form-with-images-gallery.vue`, create the filter from the existing `draftOrderItem` ref and add it to the `filters` array of their `useCustomizationsFilter()` calls, including both wizard lists; reuse `OrderItemCustomize.vue`'s existing draft binding. Verify the layouts used by the three routes render only image fields in 3.1 without changing the product source, initial state or availability calculations.

## 2. Image-only State Save

- [x] 2.1 Extend `src/themes/petsies-capybara/helpers/use-customize-action.ts` with a required product-customizations ref. For an Awaiting-artwork draft, use the shared predicate to select allowed image IDs and omit other state entries before existing sentinel filtering; retain values and quantities without limiting the page to one image customization. Verify exact service arguments for mixed state and state without a matching image entry in 3.2, and the unmodified Awaiting-customization path in 3.3.
- [x] 2.2 Supply the new argument from the gallery's and wizard's existing product-customization refs, and from a computed list of the inline helper's already-selected customization in `helpers/use-order-item-photo-upload.ts`. Adapt affected test mocks only as needed to expose the real predicate/status enum and accept the new argument. Verify page wiring in 3.2 and run the existing inline helper, form and Order History integration specs in 4.1; the inline selection code and its first-match multiplicity must remain unchanged.

## 3. Four Acceptance Scenarios

- [x] 3.1 **Awaiting artwork shows only image upload customizations on the page:** Add `src/themes/petsies-capybara/pages/OrderItemCustomize.spec.ts` using the real layouts, display filter and grouping code with unrelated services and widget rendering stubbed. Cover the layouts used by the three routes (wizard and gallery) with mixed products containing one and several otherwise eligible image fields, grouped and ungrouped under their existing rendering rules; assert only image customization IDs render in both the wizard's normal and selected-locked lists and in the gallery, and preserve input data. Keep the Upgrades fixture solely to assert the step still renders. Verify with 4.1.
- [x] 3.2 **Awaiting artwork saves only image upload entries:** Add `src/themes/petsies-capybara/helpers/use-customize-action.spec.ts` with mixed draft-derived state and non-image entries merged after initialization. Assert the exact save argument retains all matching image entries and their complete values/quantities, omits other entries including groups, yields `[]` when state has no matching image entry despite product image metadata, and precedes the existing submit call; assert the gallery/wizard metadata inputs in the page integration spec. Verify with 4.1.
- [x] 3.3 **Awaiting customization remains unchanged:** In the two specs above, reuse mixed fixtures with `BudsieStatus.AWAITING_CUSTOMIZATION` to assert the previous fields and existing draft initialization remain and non-image entries are still saved subject only to the existing sentinel filter. Verify with 4.1; keep compatibility checks in this scenario rather than adding acceptance scenarios.
- [x] 3.4 **Inline upload for Awaiting artwork shows only an image upload customization:** Reuse the existing helper tests cited by name in design decision 3; verify they still pass after 2.2 with the focused command in 4.1, without adding inline tests or extending the form spec's coverage.

## 4. Validation

Run these root `package.json` scripts from the combined app/theme checkout. `AGENTS.md` identifies `test:unit:maintained` as the CI suite; no `core/`-only tests apply. The same implementation and scenario fixtures apply to all five brand lines listed in the design; when delivered, the app and companion theme changes must be aligned with their bases so CI selects the intended code.

- [x] 4.1 Run the focused new and affected regression specs, and record the result:

  ```sh
  yarn test:unit:maintained --runInBand --runTestsByPath \
    src/themes/petsies-capybara/pages/OrderItemCustomize.spec.ts \
    src/themes/petsies-capybara/helpers/use-customize-action.spec.ts \
    src/themes/petsies-capybara/helpers/use-order-item-photo-upload.spec.ts \
    src/themes/petsies-capybara/components/customization-system/forms/order-item-photo-upload-form.spec.ts \
    src/modules/orders-history/test/unit/components/order-item-photo-upload.spec.ts \
    src/modules/orders-history/test/unit/components/order-item-photo-upload-submission.spec.ts
  ```

- [x] 4.2 Run `yarn lint` and `yarn type-check`; record both results for the app and theme together.
- [x] 4.3 Run `yarn test:unit:maintained` and record the full maintained-suite result.
- [x] 4.4 Run `openspec validate i-37263-limit-awaiting-artwork-to-image-customizations --strict` (use `/home/tons/.npm-global/bin/openspec` if needed), then review app/theme diffs to confirm changes match the four scenarios: no status-specific behavior for other statuses, inline selection changes, alteration-flow changes, backend changes, configuration, stores or dependencies. Record validation and scope-review results.
