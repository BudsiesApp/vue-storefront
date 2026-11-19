# Proposal

## Why

Magento accepts only image customizations for Awaiting-artwork items, so the direct completion page must work with image-only data throughout its form. Testing the committed display/save restriction found that a hidden upload-method dependency could remove the saved photo and leave the wizard stuck; app `5bf2951d4` and theme `43e1059d` implement source filtering and the upload headings. External review now requires a saved-position fix, application-scoped heading translation, an accurate optional type and direct save/submit regression evidence.

## What Changes

- For Awaiting artwork, supply the creation wizard and images gallery with only image upload customizations plus unchanged group entries, and initialize them with only the draft's image entries. Image availability rules do not apply in this completion flow; locally restored non-image entries are discarded before saving.
- Preserve the image predicate and rework the existing Awaiting-artwork composable into the shared source filter. Replace the former display predicate, save-time filter and hidden-checkbox reset with this single boundary.
- Keep the completed Photo-step title `Upload Photos of Your Pet`, the forevers/golf upload h1 variants and their translations. Use the application i18n service for the new wizard title. Other statuses retain their existing fields, availability, state and headings; printed-product still has no h1.
- Preserve the inline Order History upload, Upgrades and the existing step infrastructure. Scope remains the wizard and gallery used by the three direct completion routes.
- For Awaiting artwork, restore local photo state while ignoring the saved wizard position so the form opens on Photo. Keep saved-position restoration for other statuses.
- Make customization availability rules optional so the source filter can return an image copy without a cast.
- Strengthen the page regression through the real save helper and mocked save/submit services; add one saved-position case and retain heading and inline tests. Remove the unsupported image-quantity preservation guarantee without changing generic state initialization.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `order-history-item-photo-upload`: Refine direct missing-artwork completion with restored Photo-step positioning and complete-value guarantees while retaining image-only inputs, upload headings and inline behavior.

## Impact

- App: the source-filter composable, its existing spec and the `Customization` type; retain `isImageUploadCustomization()` and both module exports.
- Theme: wizard position restoration, wizard title translation and page regression coverage; retain source-ref wiring, last-step title, page h1 and `resource/i18n/en-US.csv` work.
- Remove the superseded helper changes, reset and tests listed in the design's removal decision. The inline upload has no final code change relative to the base revisions.
- The route-specific behavior applies on the theme branches that expose these pages. No Magento behavior, endpoints, stores, dependencies or configuration change; bulk completion and `order-item-customization-form.vue` remain outside scope.
