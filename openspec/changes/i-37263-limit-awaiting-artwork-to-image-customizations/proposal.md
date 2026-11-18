# Proposal

## Why

The direct customization page currently offers non-image customizations for items in Awaiting artwork. Magento rejects those entries for such items; the storefront must restrict both the offered fields and the state sent when saving.

## What Changes

- Restrict editable customizations on `OrderItemCustomize.vue` to `WidgetType.IMAGE_UPLOAD` when the loaded draft item's status is `BudsieStatus.AWAITING_ARTWORK`, in the layouts used by the three routes: the creation wizard for `forevers-customize` and `golf-head-covers-customize`, and the images gallery for `printed-product-customize`, across the five brand themes.
- Restrict the page's state-save payload to image customization IDs, including when draft or locally restored state contains other entries.
- Preserve the existing completion behavior for Awaiting customization and other statuses, the separate Upgrades alteration step, and the inline upload's first-eligible-image selection.
- Add focused regression coverage for the page restriction, its save payload and Awaiting-customization compatibility; reuse the existing inline helper tests for the already-satisfied inline acceptance criterion.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `order-history-item-photo-upload`: Extend the existing missing-artwork completion capability to cover status-specific fields and payloads on the direct customization page. This keeps both entry points for completing the same order item in one capability.

## Impact

- Theme repository `src/themes/petsies-capybara` (`theme/`): draft-ref plumbing in `creation-wizard-form.vue` and `form-with-images-gallery.vue`, `use-customize-action.ts`, its callers, and focused Jest specs. The customization page already supplies the draft prop to its selected layout.
- App repository: one pure image-widget predicate under `src/modules/customization-system/helpers/` and a separate Awaiting-artwork customizations filter composable, both exported by that module; existing inline tests may need their module mocks updated for the shared save helper's inputs.
- The same implementation applies to `petsies-theme`, `budsies-theme`, `budsies-education-theme`, `bulkorders-theme` and `waggables-theme`; no database-derived product assumptions are required.
- No Magento behavior, endpoints, stores, configuration or dependencies change. Bulk customization and `order-item-customization-form.vue` remain outside this change.
