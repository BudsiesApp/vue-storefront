# Design

## Context

See [proposal.md](./proposal.md) for motivation and [the delta](./specs/order-history-item-photo-upload/spec.md) for the seven scenarios. App `a9b45f5a1` and theme `9edae872` contain the original restriction; the uncommitted follow-up contains the prior reset and completed headings. This design follows the final decision recorded at the end of `tasks/i-37263-change-only-image-customization-for-awaiting-artwork-items/task.md` and replaces the previous display, save-time and reset decisions.

- The wizard reads `product/getCurrentProduct`; the gallery reads its product prop. Both define `productCustomizations` and `initialCustomizationState` near the start of setup, before state, purchase flow, availability, defaults, locked filtering, preservation and saving.
- `useCustomizationState()` serializes only truthy values. `useAvailableCustomizations().removeUnavailableOptionValues()` clears entries whose customization is absent from its available list, and defaults are filled only for available customizations.
- Local restoration merges state then calls unavailable-value cleanup (`src/modules/customization-system/composables/use-customization-state-preservation.ts:184-185`). This order provides the existing cleanup boundary for restored entries.
- Group definitions and parent IDs are needed by `useCustomizationsGroups()`; empty groups already drop out through grouping.

The verified Forevers reproduction in `tasks/i-37263-change-only-image-customization-for-awaiting-artwork-items/06-investigate.out.md` used the adjacent real product/draft files. The draft stores Yes for `Send Later Upload Method`, while required `Customer Image` requires No; display-only filtering leaves the dependency active, cleanup removes the photo, and zero wizard root groups cause rendering to throw on `lastStepCustomization.name`, retaining a stale Photo screen. The gallery loses its uploader through the same dependency. Original tests missed this because their synthetic image fixtures had no availability rules.

## Goals / Non-Goals

**Goals:** Establish the image-only form contract before downstream processing, preserve product/draft inputs and complete photo values, and retain the verified heading behavior.

**Non-Goals:** Changing generic availability, defaulting, persistence, save/submit infrastructure, product configuration, other statuses or the inline completion flow; adding product-ID conditions or changing wizard-step infrastructure.

## Decisions

### Source filtering

Keep `useAwaitingArtworkCustomizationsFilter` in its existing module path and export. It takes the product-customizations ref, initial-customization-state ref and draft ref, and returns filtered refs of the first two inputs. Only for `BudsieStatus.AWAITING_ARTWORK`, keep customizations matching the retained `isImageUploadCustomization()` predicate plus every `CustomizationType.OPTIONS_GROUP` entry; retain groups unchanged and copy each image customization without its `availabilityRules`. Keep only initial-state entries whose IDs belong to those image customizations, preserving their complete values and quantities. For another status or no draft, return the input values unchanged, including their identity; never mutate the product or draft.

Image rules refer to options removed from the image-only page, such as Forevers' No value of `Send Later Upload Method`, so retaining those rules would make the photo unavailable and empty the wizard again. The user confirmed extra images have no upload-later feature and no Awaiting-artwork image field has another value dependency that matters; removing the rules is therefore appropriate for this status.

The filtered list lets existing unavailable-value cleanup discard restored non-image entries before serialization, while image entries remain available. Together with filtered draft initialization, this makes the state passed to saving image-only without adding another filter or altering cleanup/default logic.

### Layout wiring

In `creation-wizard-form.vue` and `form-with-images-gallery.vue`, apply the composable to the existing `productCustomizations` and `initialCustomizationState` computeds. Use its returned refs everywhere the raw computeds were consumed, including state initialization, purchase flow, availability, defaults, locked filtering, preservation and saving. This common source boundary covers both wizard lists and the gallery while preserving the wizard's store-backed product source; `useCustomizationsFilter()` remains generic.

### Remove superseded implementation

Remove the old per-customization predicate returned by the composable and its entries in both wizard `filters` arrays and the gallery's array. Restore `theme/helpers/use-customize-action.ts` and `theme/helpers/use-order-item-photo-upload.ts` to theme base `b6f3326e`, restore two-argument save-helper calls in their consumers, and delete `theme/helpers/use-customize-action.spec.ts`. Restore `src/modules/customization-system/composables/use-purchase-flow-customizations.ts` to app HEAD and delete its new composable spec.

Revert mock edits made solely for those removed pieces in `theme/helpers/use-order-item-photo-upload.spec.ts`, `theme/components/customization-system/forms/order-item-photo-upload-form.spec.ts`, `theme/components/customization-system/forms/vertical-steps-restoration.spec.ts` and `src/modules/orders-history/test/unit/components/order-item-photo-upload-submission.spec.ts`. Retain only mock changes needed for the new source-filter wiring; the vertical-steps regression mounts the real wizard. Use app base `83f5e687c` and theme base `b6f3326e` for final comparisons, rather than the commits that introduced the superseded implementation.

### Regression coverage

Use a compact committed fixture reduced from the real Forevers data, with real IDs: Photo group containing required `Customer Image` and its No rule plus `Send Later Upload Method`, and Pet Info group containing `Name`. Keep detailed assertions in tasks 3.1–3.2; no runtime dependency on the untracked task directory is permitted.

| Delta scenario | Regression evidence |
| --- | --- |
| Awaiting artwork shows only image upload customizations on the page | Existing mixed-fixture display cases in `theme/pages/OrderItemCustomize.spec.ts`, adapted to the new composable output. |
| Awaiting artwork saves only image upload entries | Forevers wizard draft case in the page spec inspects the state ref passed to mocked `useCustomizeAction` at Confirm; the restoration case below establishes the restored-state part of the contract. |
| Awaiting customization remains unchanged | Existing mixed-fixture page cases retain the prior fields/state, and the new composable spec verifies unchanged input identity for this status. |
| Inline upload for Awaiting artwork shows only an image upload customization | Existing `theme/helpers/use-order-item-photo-upload.spec.ts` first-eligible-image, non-image-ineligibility and complete-photo save-before-submit tests; no new inline behavior or tests. |
| Awaiting artwork retains its photo field and wizard step when draft state gates the image upload | Forevers draft cases in the page spec: wizard Photo with draft photo, Photo then Upgrades, Confirm activates Upgrades without render errors; gallery uploader with draft photo. |
| Awaiting artwork discards restored non-image entries and retains its photo | New `src/modules/customization-system/test/unit/composables/use-awaiting-artwork-customizations-filter.spec.ts`: real state and availability on the filtered list, merge Yes, Name and a photo, then cleanup in the same tick; only the photo remains and its field is available. |
| Awaiting-artwork headings and unchanged Awaiting-customization headings | Retained page-spec heading cases for Awaiting artwork and Awaiting customization, including the no-title fallback. |

### Five brand lines and inline compatibility

Use the same app helper and theme patch for `petsies-theme`, `budsies-theme`, `budsies-education-theme`, `bulkorders-theme` and `waggables-theme`, with no brand switches. Inline Order History upload retains its base implementation, first-eligible-image selection, eligibility and submission behavior with no final code change; Upgrades also remains unchanged. App and companion theme branches must remain aligned with their bases under `AGENTS.md` CI selection rules.

### 6. Keep existing step rendering without an empty-group guard

Add no zero-group handling in the wizard or gallery. The verified products served by these routes retain an image upload after source filtering removes the inapplicable image rules, restoring Photo-to-Upgrades behavior without changing step infrastructure.

### 7. Supply an optional last-step title from the wizard

Keep the optional `title` prop in `theme/components/customization-system/forms/creation-wizard-form-last-step.vue`; use it when supplied, otherwise keep `$t('Customize your {productType}', { productType })`. In `creation-wizard-form.vue`, use its existing draft prop to pass translated `Upload Photos of Your Pet` only for `BudsieStatus.AWAITING_ARTWORK`, leaving the prop unset otherwise; this keeps the last step independent of draft/status data and preserves regular creation and Awaiting-customization headings.

### 8. Select the Awaiting-artwork page h1 in the page

Keep `mainTitleText` in `theme/pages/OrderItemCustomize.vue` returning `Upload Photos for Your Forevers Plush` or `Upload Photos for Your Golf Head Covers` for Awaiting artwork and the corresponding product type; other statuses retain the current `Customize Your …` texts and printed-product still has no h1. The page already owns both draft and product-type inputs, so the selection belongs at its existing h1 boundary.

### 9. Extract the three new translation strings

Keep `$t` / `applicationI18n.t` for the new heading strings and the three extracted keys in `theme/resource/i18n/en-US.csv`, produced by root `yarn update-i18n-files`. This is the English source file targeted by the package script and keeps the headings in the existing localization workflow.

## Risks / Trade-offs

- [A raw ref bypasses the source filter] → Review every consumer in both layouts and inspect the state passed to the save mock in the Forevers page case.
- [Restored entries survive until saving] → Exercise the real merge/cleanup sequence in the composable regression and assert serialized state contains only the photo.
- [Cleanup removes a retained image or group structure is lost] → Assert the reduced real-data fixture's copied image, unchanged groups and retained photo, then verify actual wizard navigation.
