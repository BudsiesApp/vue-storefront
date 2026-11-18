# Design

## Context

See [proposal.md](./proposal.md) for motivation and [the capability delta](./specs/order-history-item-photo-upload/spec.md) for the four acceptance scenarios. Source inspection, rather than the task's historical observations, establishes these boundaries:

- `OrderItemCustomize.vue` loads the product with `useProductPage()` and the draft with `useDraftOrderItem()`; the three routes select the creation wizard or images gallery as listed in the proposal.
- `phrase-pillow-form.vue` and `vertical-steps-form.vue` are out of scope because neither is reachable from the three routes or has an order-item completion flow.
- The gallery reads `product.customizations`; the wizard declares no product prop and instead reads `product/getCurrentProduct`, so filtering the page's `:product` input would not control it.
- The layouts used by the three routes pass their rendered fields through `useCustomizationsFilter()`, which accepts a list of per-customization filters, including both the wizard's normal list and its selected-locked list. Both already declare the page-supplied `draftOrderItem` prop.
- `useCustomizationsGroups()` requires group definitions and parent IDs to render grouped options. Deleting every definition without an image widget would also delete the groups containing the image fields.
- The gallery and wizard seed `useCustomizationState()` with the draft's whole `customization_state` and call `useCustomizeAction()`.
- State entries contain IDs, quantities and values, with no widget metadata. `useCustomizationState()` serializes its value dictionary; `filterCustomizationState()` removes the standard production-time sentinel but does not restrict entries by widget. Local restoration merges state and then cleans unavailable values; display filtering alone is not the save contract.
- Inline upload selects one unlocked completion-flow image customization before fetching the draft, seeds only its entry and calls the same save helper; its selection is independent of draft status.

## Goals / Non-Goals

**Goals:** Enforce the added contract through a dedicated display filter and existing state-save boundary using loaded product metadata, without mutating the catalog product or draft.

**Non-Goals:** Restructuring purchase-flow, availability, persistence, wizard-step rendering or API infrastructure.

## Decisions

### 1. Add a separate display filter passed to the existing filter list

Add the pure `isImageUploadCustomization(customization)` predicate in `src/modules/customization-system/helpers/is-image-upload-customization.ts` and export it through the module's `index.ts`; it compares `optionData?.displayWidget` with `WidgetType.IMAGE_UPLOAD`. No existing exported predicate provides this classification, and sharing it keeps display and payload selection consistent without a new composable or service.

Leave `useCustomizationsFilter()` unchanged. Add `useAwaitingArtworkCustomizationsFilter(draftOrderItem)` in `composables/use-awaiting-artwork-customizations-filter.ts`, exported through the module `index.ts`; it takes `Ref<DraftOrderItem | undefined>` and returns `customizationsFilter`, a `(customization) => boolean` in the style of the locked and A/B-testing filters. Only when the draft status is `BudsieStatus.AWAITING_ARTWORK` does it reject customizations of type `CustomizationType.OPTION` that fail the image predicate; group definitions and every other case pass.

Create the filter from the existing draft ref in the gallery and the wizard, and add it to the `filters` array of the gallery's `useCustomizationsFilter()` call and both wizard calls, like `requiredCustomizationsFilter`. This is one filter implementation with no layout-specific copies of the policy. Keep group metadata, IDs, parent links and order intact so the existing grouping code can organize image fields and omit empty groups; group definitions are layout structure, never additional editable fields or permitted save entries.

The existing filter list is the smallest extension point shared by the rendered field lists in scope, including the wizard's selected-locked list. Independent layout filters duplicate the policy; filtering earlier in `usePurchaseFlowCustomizations()` or the page product removes definitions needed by state cleanup and availability evaluation, and a page-product filter also requires changing the wizard's product source. Filtering presentation instead leaves those calculations and the store product untouched, and the generic filter and its other callers stay untouched.

### 2. Restrict outgoing state in the existing save helper

Add a required third `Ref<Customization[]>` argument to `useCustomizeAction()`. Gallery and wizard pass their existing product-customization refs; inline upload passes a computed list containing only its already-selected customization, without changing how that selection is made.

Inside `confirmCustomization()`, when the loaded draft status is `BudsieStatus.AWAITING_ARTWORK`, derive allowed IDs from that metadata using the shared image predicate and filter the current state by `customization_id` before applying the existing `filterCustomizationState()`. Other statuses keep the existing state filtering path exactly. Preserve each retained entry's current value and quantity, allow every matching image ID on the page, and produce an empty array when none matches; never fall back to the unfiltered state.

This boundary prevents the concrete rejection caused by non-image entries surviving draft initialization or later state merges. Value-shape checks cannot identify a customization's widget, and filtering only the initial draft would miss later merges; a required metadata input avoids an optional bypass in the helper used by both page submitters. Leave initial draft state intact for existing availability evaluation and preserve the current save-then-submit and error behavior. The service already serializes only item ID and customization state, so using the draft's status for this local decision changes no HTTP contract.

### 3. Keep four regression scenarios, using synthetic product fixtures

Use the following one-to-one mapping; parameterized products are cases within these scenarios, not additional requirements. Test real page/layout wiring and the save helper while stubbing unrelated services and rendering customization controls as identifiable fields.

| Delta scenario | Regression evidence |
| --- | --- |
| Awaiting artwork shows only image upload customizations on the page | New `theme/pages/OrderItemCustomize.spec.ts`: exercise the layouts used by the three routes (wizard and gallery) with one and several eligible images mixed with non-image options, covering grouped and ungrouped fields under their existing rendering rules. Assert rendered field IDs, no non-image field in either the wizard's normal or selected-locked list, and intact product/draft inputs; use the real display filters and grouping logic. Keep an Upgrades fixture only to assert that the step still renders. |
| Awaiting artwork saves only image upload entries | New `theme/helpers/use-customize-action.spec.ts`: call the real helper with mixed draft-derived/merged state and product metadata; assert the exact image-only save argument, retained image values/quantities, empty result when the state has no matching image entry and the existing subsequent submit. Page integration asserts the gallery/wizard supply their product metadata to that helper. |
| Awaiting customization remains unchanged | In those same two specs, use status `AWAITING_CUSTOMIZATION` and the same mixed fixtures to assert the prior fields and draft values remain, and the save argument still includes non-image entries subject only to existing sentinel filtering. |
| Inline upload for Awaiting artwork shows only an image upload customization | Reuse `theme/helpers/use-order-item-photo-upload.spec.ts`: `loads locally, ignores tracker status and seeds the first eligible field with retained photos` covers the first match among several image fields; the `text_input` case of `keeps fallback for ineligible configuration %p` rejects a non-image widget; and `sends only the complete selected photo value, saves before submit, then marks submitted and reports submission` asserts the exact selected-image payload against the shared photo/email draft fixture. Together these cover all three facts without a new assertion, test or form-spec extension; rerun them after the save-helper signature change. |

### 4. Apply one behavior across the five brand lines

Use the same app helper and theme patch for `petsies-theme`, `budsies-theme`, `budsies-education-theme`, `bulkorders-theme` and `waggables-theme`, with no brand switches or product-specific IDs. Validation uses the scripts in root `package.json`; companion theme/app branches must remain aligned with their bases under the CI selection rules in `AGENTS.md`.

## Risks / Trade-offs

- [Only one wizard list is restricted, or group structure is dropped] → Exercise both its normal and selected-locked fields with grouped image fixtures in the page scenario.
- [A clean initial fixture masks leaked state at save time] → Put non-image entries directly in the helper's input state after initialization and assert the full service argument.
- [No database is available to supply representative products] → Use explicit mixed configurations with one and multiple image fields; behavior depends only on product metadata and draft status.
