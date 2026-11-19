# Tasks

Paths are relative to the app repository; `theme/` in the design means `src/themes/petsies-capybara/`, a separate repository. Checked tasks describe completed work retained in the final design, committed in app `5bf2951d4` and theme `43e1059d`. Sections 1–7 record that completed implementation and validation; sections 8–9 cover the external-review follow-up; this artifact update itself changes only this OpenSpec change directory.

## 1. Shared Source Filter

- [x] 1.1 Keep `src/modules/customization-system/helpers/is-image-upload-customization.ts` and its module export. Verify its image-widget classification remains the predicate used by the source filter in 3.1.
- [x] 1.2 Rework `src/modules/customization-system/composables/use-awaiting-artwork-customizations-filter.ts` and retain its export according to the design's Source filtering decision. Verify status-specific output, image copies without rules, unchanged groups, image-only initial state and input immutability/identity through 3.1 and 7.1.
- [x] 1.3 Wire the returned refs into every former `productCustomizations` and `initialCustomizationState` consumer in `src/themes/petsies-capybara/components/customization-system/forms/creation-wizard-form.vue` and `form-with-images-gallery.vue`. Remove the obsolete per-customization display predicate and its entries from both wizard filter arrays and the gallery filter array; keep `useCustomizationsFilter()` generic. Verify source-ref usage by reviewing both setup functions and the mixed/Forevers page cases in 3.2 and 7.1.

## 2. Remove Superseded Code and Mocks

- [x] 2.1 Perform the design's save-helper removal: restore `src/themes/petsies-capybara/helpers/use-customize-action.ts` and `helpers/use-order-item-photo-upload.ts` to theme base, return consumers to two-argument calls and delete `helpers/use-customize-action.spec.ts`. Verify helper files have no base diff and the deleted spec is absent in 7.5; verify existing inline behavior with 7.1.
- [x] 2.2 Remove the previous hidden-checkbox reset by restoring `src/modules/customization-system/composables/use-purchase-flow-customizations.ts` to app HEAD and deleting `src/modules/customization-system/test/unit/composables/use-purchase-flow-customizations.spec.ts`. Verify no reset or reset-spec remains through the comparisons and absence check in 7.5.
- [x] 2.3 Reconcile the four affected test mocks listed in the design's removal decision against their repository bases, reverting only edits solely needed by removed pieces and retaining changes needed by the new wiring. Verify the final diffs through 7.5 and rerun all affected specs with 7.1, including the real-wizard case in `vertical-steps-restoration.spec.ts`.

## 3. Completed Regression Coverage

- [x] 3.1 Add `src/modules/customization-system/test/unit/composables/use-awaiting-artwork-customizations-filter.spec.ts` using the compact Forevers fixture specified in the design, with real IDs from the task data. Assert Awaiting-artwork output contains the copied image without rules, unchanged Photo/Pet Info groups and only image initial-state entries, preserving complete values and both source inputs; assert Awaiting-customization inputs are returned as they are. Cover restoration once using real `useCustomizationState()` and `useAvailableCustomizations()` on the filtered list: merge the checkbox Yes, Name and a photo, call `removeUnavailableOptionValues()` in the same tick, and assert serialized state holds only the photo and its upload remains available. No storage or preservation-composable harness is needed. Run with 7.1.
- [x] 3.2 Adapt `src/themes/petsies-capybara/pages/OrderItemCustomize.spec.ts` to the new source-filter API. Retain existing mixed-fixture display and Awaiting-customization cases, the Forevers draft cases and the completed heading cases; remove the case asserting product customizations are passed to the save helper. For Forevers, assert the wizard renders Photo with its uploader and draft photo, lists Photo then Upgrades, and activates Upgrades after Confirm without render errors; retain the existing image-only state coverage; strengthen this case to assert actual save/submit calls in 8.5. Assert the gallery renders its uploader and draft photo. Use real state/default/purchase-flow/availability/grouping and last-step rendering; retain name-based step activation stubs if real `SfSteps`/`SfStep` do not load without configuration changes, and never change Jest configuration. Preserve source inputs, keep restoration solely in 3.1 and run with 7.1.

## 6. Completed Heading Work to Retain

- [x] 6.1 Keep the optional last-step title and wizard status selection from design decision 7. Verify the title override and no-title fallback through the existing heading cases and 7.1.
- [x] 6.2 Keep `mainTitleText` status-specific h1 selection from design decision 8. Verify both product-type heading cases through 6.4 and 7.1.
- [x] 6.3 Keep the three extracted English heading keys from design decision 9 in `src/themes/petsies-capybara/resource/i18n/en-US.csv`, produced by `yarn update-i18n-files`. Verify the keys and retained extraction diff remain correct.
- [x] 6.4 Keep the real-last-step page-spec heading cases: Awaiting artwork shows `Upload Photos of Your Pet` and the new h1 for forevers and golf head covers; Awaiting customization keeps `Customize your {productType}` and the current h1 for both types, proving the fallback without a title. Rerun with 7.1 after adapting the page harness.

## 7. Completed Validation of the Source-filter Implementation

Use the combined app/theme checkout and root `package.json` scripts. `AGENTS.md` identifies the maintained suite as the CI suite; no core-only tests change. The checks below were completed for app `5bf2951d4` and theme `43e1059d`; fresh validation of the review fixes is tracked in section 9.

- [x] 7.1 Run the focused regression command and record its result for source filtering, restoration cleanup, draft rendering/navigation, image-only state at Confirm, headings and unchanged inline behavior:

  ```sh
  yarn test:unit:maintained --runInBand --runTestsByPath \
    src/modules/customization-system/test/unit/composables/use-awaiting-artwork-customizations-filter.spec.ts \
    src/themes/petsies-capybara/pages/OrderItemCustomize.spec.ts \
    src/themes/petsies-capybara/helpers/use-order-item-photo-upload.spec.ts \
    src/themes/petsies-capybara/components/customization-system/forms/order-item-photo-upload-form.spec.ts \
    src/themes/petsies-capybara/components/customization-system/forms/vertical-steps-restoration.spec.ts \
    src/modules/orders-history/test/unit/components/order-item-photo-upload.spec.ts \
    src/modules/orders-history/test/unit/components/order-item-photo-upload-submission.spec.ts
  ```

- [x] 7.2 Run `yarn lint` and `yarn type-check`; record both results for app and theme together.
- [x] 7.3 Run `yarn test:unit:maintained` and record the full maintained-suite result.
- [x] 7.4 Run `openspec validate i-37263-limit-awaiting-artwork-to-image-customizations --strict` (use `/home/tons/.npm-global/bin/openspec` if needed) and record its result. Review scope against the seven scenarios and retained design decisions, including unchanged Upgrades/inline behavior and no empty-step guard.
- [x] 7.5 Verify reverts with read-only comparisons in the correct repositories. The first two commands below must show no remaining diff; compare the affected mock files against their bases and allow only edits needed by the new source wiring, documenting any retained lines. Confirm both deleted specs are absent; review both layout diffs to ensure the old filter-array entries and third save argument are gone while completed heading changes remain.

  ```sh
  git -C src/themes/petsies-capybara diff --exit-code b6f3326e -- helpers/use-customize-action.ts helpers/use-order-item-photo-upload.ts
  git diff --exit-code HEAD -- src/modules/customization-system/composables/use-purchase-flow-customizations.ts
  git diff 83f5e687c -- src/modules/customization-system/composables/use-purchase-flow-customizations.ts src/modules/orders-history/test/unit/components/order-item-photo-upload-submission.spec.ts
  git -C src/themes/petsies-capybara diff b6f3326e -- helpers/use-order-item-photo-upload.spec.ts components/customization-system/forms/order-item-photo-upload-form.spec.ts components/customization-system/forms/vertical-steps-restoration.spec.ts
  git -C src/themes/petsies-capybara diff b6f3326e -- components/customization-system/forms/creation-wizard-form.vue components/customization-system/forms/form-with-images-gallery.vue
  ```

## 8. External-review Follow-up

- [x] 8.1 Implement the saved-position decision BL-1 in `src/themes/petsies-capybara/components/customization-system/forms/creation-wizard-form.vue`. Add exactly one case in `pages/OrderItemCustomize.spec.ts`: have the mocked `useCustomizationStatePreservation` apply a restored photo and invoke the real `afterCustomizationStateMerge` callback it receives with `{ customizationState: [photoEntry], additionalData: { stepIndex: 1 } }`; assert Photo stays active with the restored photo. Keep the existing restoration behavior for other statuses, and run with 9.1.
- [x] 8.2 Verify the spec-only BL-2 resolution removes image-quantity preservation claims from the requirement, scenarios, design and tasks while keeping complete-value guarantees. Confirm draft-initialization regression fixtures use normal quantity 1 and assert no non-default quantity preservation; make no generic initializer change. Verify the artifact diff and run 9.1.
- [x] 8.3 Change only the new wizard title translation to the application-service i18n source in design decision 7 (AI-1). Verify `lastStepTitle` uses that service, existing legacy calls remain unchanged and the heading cases pass with 9.1.
- [x] 8.4 Implement the optional `Customization.availabilityRules` type and remove the source-filter image cast per II-1. Verify the image-copy output through the existing composable spec with 9.1 and type correctness with 9.2.
- [x] 8.5 Strengthen `src/themes/petsies-capybara/pages/OrderItemCustomize.spec.ts` per the real-helper save-evidence decision II-2. Replace the helper mock with resolved, error-free save/submit service mocks in the customization-system module mock; in the existing Forevers wizard case assert the exact one-photo save body and user token, one save, subsequent submit for the same item and active Upgrades. Run with 9.1; retain all existing display, restoration and heading cases.

## 9. Review-fix Validation

Run root scripts against the combined app/theme checkout.

- [x] 9.1 Run the focused regression command and record the result for the eight scenarios, including the one saved-position case and real save/submit evidence:

  ```sh
  yarn test:unit:maintained --runInBand --runTestsByPath \
    src/modules/customization-system/test/unit/composables/use-awaiting-artwork-customizations-filter.spec.ts \
    src/themes/petsies-capybara/pages/OrderItemCustomize.spec.ts \
    src/themes/petsies-capybara/helpers/use-order-item-photo-upload.spec.ts \
    src/themes/petsies-capybara/components/customization-system/forms/order-item-photo-upload-form.spec.ts \
    src/themes/petsies-capybara/components/customization-system/forms/vertical-steps-restoration.spec.ts \
    src/modules/orders-history/test/unit/components/order-item-photo-upload.spec.ts \
    src/modules/orders-history/test/unit/components/order-item-photo-upload-submission.spec.ts
  ```

- [x] 9.2 Run `yarn lint` and `yarn type-check`; record both results for app and theme together.
- [x] 9.3 Run `yarn test:unit:maintained` and record the full maintained-suite result.
- [x] 9.4 Run `openspec validate i-37263-limit-awaiting-artwork-to-image-customizations --strict` (use `/home/tons/.npm-global/bin/openspec` if needed), record the result and review app/theme diffs against the accepted review decisions and eight scenarios. Confirm inline upload and Upgrades behavior remain unchanged and no unrelated production, delivery or generic-state work was added.
