# Proposal

## Why

Magento accepts only image customizations for Awaiting-artwork items, so the direct completion page must work with image-only data throughout its form. Testing the committed display/save restriction found that a hidden upload-method dependency could remove the saved photo and leave the wizard stuck; the final design removes that dependency at the form source and retains the completed upload headings.

## What Changes

- For Awaiting artwork, supply the creation wizard and images gallery with only image upload customizations plus unchanged group entries, and initialize them with only the draft's image entries. Image availability rules do not apply in this completion flow; locally restored non-image entries are discarded before saving.
- Preserve the image predicate and rework the existing Awaiting-artwork composable into the shared source filter. Replace the former display predicate, save-time filter and hidden-checkbox reset with this single boundary.
- Keep the completed Photo-step title `Upload Photos of Your Pet`, the forevers/golf upload h1 variants and their translations. Other statuses retain their existing fields, availability, state and headings; printed-product still has no h1.
- Preserve the inline Order History upload, Upgrades and the existing step infrastructure. Scope remains the wizard and gallery used by the three direct completion routes, across all five brands.
- Rework regression coverage around source filtering, draft initialization, restoration cleanup and the state passed to the existing save action; retain the heading and inline tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `order-history-item-photo-upload`: Extend missing-artwork completion to the direct customization page's image-only form inputs, state and upload headings while retaining inline behavior.

## Impact

- App: `useAwaitingArtworkCustomizationsFilter()` and its new composable spec; retain `isImageUploadCustomization()` and both module exports.
- Theme: source-ref wiring and page regression coverage in the creation wizard and images gallery; retain the completed last-step title, page h1 and `resource/i18n/en-US.csv` work.
- Remove the superseded helper changes, reset and tests listed in the design's removal decision. The inline upload has no final code change relative to the base revisions.
- The same app/theme behavior applies to Petsies, Budsies, Budsies Education, Bulk Orders and Waggables. No Magento behavior, endpoints, stores, dependencies or configuration change; bulk completion and `order-item-customization-form.vue` remain outside scope.
