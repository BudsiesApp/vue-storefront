# Design

## Context

See `proposal.md` for the two operator-requested fixes and `specs/production-time-option-presentation/spec.md` for the contract. Requirements R7–R9/G4 belong to this new storefront change. The deployed Magento change `i-37237-holiday-period-alteration-bundles` and merged PR #514 remain history, not branches to reopen.

Observed implementation:

- App `src/modules/customization-system/helpers/update-product-production-time-customization-data.ts` reads Rush add-ons from Vuex, collapses ordinary/card-list records by SKU, replaces option labels, and prepends synthetic Standard. Its `isHolidayPeriod` switch belongs to the timeline widget and is absent on the five alteration bundles. The no-add-ons path currently removes the customization by mutating the supplied product.
- App `src/modules/budsies/factories/rush-addon.factory.ts` currently uses `Boolean(data.is_domestic)`; `RushAddon.isDomestic` defaults to false. Missing ordinary metadata and an explicit international Holiday record therefore become indistinguishable in client state.
- Magento `VueStorefrontIndexer/Model/Indexer/Action/RushUpgrade.php` emits `is_domestic` only when the prepared option carries destination metadata, including false; ordinary records omit it. Holiday Standard records remain destination-tagged even when no Rush survives. No new backend flag is needed.
- `Order.shipping_address.country_id` already exists in `src/modules/orders-history/types/`. Magento `Sales/Service/LocationDetector::isOrderDomestic()` compares shipping country with `shipping/origin/country_id` for the order's store. A bounded local config read returned default `US` with no scoped override; the storefront's existing delivery-country convention and timeline are US/international. Use the order's exact `US` country as domestic and other countries as international, not the visitor-country fallback helper which defaults an absent country to US.
- Theme `helpers/use-alteration-products-loader.ts` prepares a dictionary by order item but flattens away parent orders; `helpers/use-order-item-alteration-product-loader.ts` receives `order` but does not use it. Both already load associated-product prices and Rush data through existing Vuex actions.
- Theme `helpers/use-alteration-product-customizations.ts::optionValuesFilter()` removes synthetic Standard and already-purchased values. Its `customizationsFilter()` returns early when no purchased value exists; `alteration-product-form.vue` can therefore render a Production Time heading even though the child receives no selectable values.
- The relevant loader/form/helper blobs are identical on all five fetched theme branches; the shared preparation, Rush model/factory and order contracts match on the two app brand branches. Keep each brand's other differences intact.

Canonical context: existing `production-time-option-presentation` requirements describe the product-page timeline/location toggle, not order-owned cards-list filtering. This delta adds that scoped contract without changing those requirements. `order-history-alteration-product-pricing` and archived `i-36911-fix-sneak-peek-price` require both loaders' price-prefetch path to remain. Archived `i-37022-update-holiday-period-options-display` and `i-37184-make-holiday-ssr-visitor-independent` explain why product-page location readiness and shared-SKU variants must stay intact. The Magento archive records the formerly accepted shared-list limitation; this follow-up supersedes that limitation in the storefront, not the historical archive.

## Goals / Non-Goals

**Goals:** Fix the order-owned projection before SKU collapse, and final form visibility after option filtering. Reuse the existing destination records, order response, form filters and cart flow. One app-owned OpenSpec change coordinates both repositories; do not duplicate its behavior contract in the theme's unrelated spec root.

**Non-Goals:** No new backend/API data, Magento changes, client cutoff calculation, widget switch, visitor-country lookup, slot-counter enforcement, new index trigger, payment/cache-module change, dependencies, schema, checkout validation, replacement message or order-address mutation. An open page crossing a cutoff remains the accepted O11 case. No production memberships or dates are changed by code.

## Decisions

### 1. Preserve existing destination metadata instead of inventing a Holiday detector

In app `src/modules/budsies/models/rush-addon-api-response.interface.ts`, type `is_domestic` as optional and compatible with the backend's boolean representation (and the numeric representation already handled). Preserve its absence as `undefined` in `RushAddon.isDomestic` and the factory rather than coercing it to false. Explicit false/zero must still become false; true/one becomes true. Keep other fields and constructor positions compatible.

The canonical producer already supplies the necessary discriminator: ordinary records are untagged, Holiday records are tagged. Do not infer Holiday membership from labels, SKU prefixes, duplicate records, current dates, `isInTimeForChristmas` truthiness, or `displayWidgetOptions.isHolidayPeriod`. This preserves false international records and ordinary data without another flag or API request. Existing timeline code filters tagged records only within Holiday widget mode and remains unchanged.

Cost: rung 4, a small extension around existing rung-2 contracts. Configuration alone (rung 1) either keeps the defect or enables a timeline toggle the PM excludes. Building another cutoff engine or changing Magento is unnecessary and out of scope.

### 2. Add an optional order-destination projection to existing preparation

Extend the preparation helper's existing options with an optional `isDomestic?: boolean`. When supplied, retain untagged ordinary add-ons as before and retain tagged Holiday add-ons only when their destination equals that value. Apply this before Standard lookup and SKU-dictionary construction. Check optionality by type/presence, not truthiness: international false is a supplied context. Callers without this option retain the current timeline/product-page path, including its location readiness, manual toggle and slot policy.

Do not set `isHolidayPeriod` merely to obtain filtering: that also changes presentation and enforces slots, contrary to O7/O8. The cards-list path continues to use its existing labels and does not acquire the timeline's zero-slot exclusion. Preserve original option-value IDs, SKUs, prices and bundle selection linkage; metadata chooses which existing value is offered, not another product to buy.

Make the existing no-add-ons removal return an immutable product/customization-array projection. All preparation paths must leave the Vuex product dictionary and Rush arrays unchanged. This is required R7 isolation, not a new cache subsystem: the same cached bundle is rendered for orders with different destinations. No cloning of the whole catalog, per-order Vuex cache, new store keys or imperative dictionary writes are needed.

Alternative: filter only the rendered widget after SKU collapse. That is too late to recover the international record's identity/terms and would require wider component plumbing. Filtering the global Vuex getter would affect product pages and other orders. A separate preparation pipeline would duplicate existing Standard/label/identity logic.

### 3. Pass the owning order through both theme loaders

In `use-alteration-products-loader.ts`, keep the existing flattened SKU/load collection if useful, but construct `alterationProductByOrderItemId` by iterating each parent order and its items. For each prepared product pass `makeProductionTimeRequired: false` plus `isDomestic: order.shipping_address.country_id === 'US'`. Prepare a fresh projection per order item, even when SKUs match. Keep associated-product prefetch and Rush requests unchanged.

In `use-order-item-alteration-product-loader.ts`, use the existing `order` ref to pass the same context. Do not expose the prepared alteration product until its owning order is available; its existing undefined/loading form path already accommodates this. Recompute from the raw product dictionary when the order or its shipping data changes; do not mutate raw catalog data or borrow context from the previous order. No persisted-country, cookie or browser-location fallback belongs here.

A pure shared classification helper is optional only if it reduces repeated code; an equality check in each loader is enough. Do not add address-shape guards or generalized store-country configuration without a real missing-data contract. The API already provides the order and shipping-country contract for these physical-item forms. The local and existing storefront US convention is the evidence for this scope; if release configuration reveals a non-US shipping origin, raise it to the PM under O12 before inventing another classifier or changing APIs.

### 4. Filter the empty customization at the existing alteration boundary

In theme `use-alteration-product-customizations.ts::customizationsFilter()`, before the early return for a missing purchased value, handle `OptionType.PRODUCTION_TIME`: require at least one available value that passes the same `optionValuesFilter()` already supplied to the form's value projection. Synthetic Standard and already-purchased values do not count. Use that existing filter instead of creating a second list of excluded IDs.

`alteration-product-form.vue` already renders headings/controls by iterating `filteredCustomizations`; omitting that customization removes the entire section. Leave other customization types, collapsed-view calculation, validation, Standard bookkeeping and add-to-cart handling alone. Do not hide only the child widget with CSS or alter `requiredCustomizationsFilter` globally. A local predicate fixes R8 at the owner and avoids changing unrelated required fields.

### 5. Coordinate branch variants and existing CI, not new build infrastructure

All branches below were created locally from fetched current brand bases; primary app/theme checkouts stay on `37237-order-history-holiday-upgrades`. No feature source is implemented during planning.

- App `BudsiesApp/vue-storefront`: `37237-order-history-holiday-upgrades` → `petsies-theme` (base `dd5d6b3ee116e2c675d28b52e5eb370f8941c82b`); `37237-order-history-holiday-upgrades-bulkorders` → `bulkorders-theme` (base `840c1a6b3816ff0b28f93128e64ea35bead746bb`).
- Theme `BudsiesApp/vsf-capybara`: `37237-order-history-holiday-upgrades` → `petsies-theme` (base `9c8e7cb939ae6e52ea42a39a7b1257a99c23abb9`); suffix `-budsies` → `budsies-theme` (`9a0cc51c21016e919ccb6b9a97f2cc5851236043`); suffix `-education` → `budsies-education-theme` (`2e9e282bdc27faa56d6cf5cba546fdba0396c71b`); suffix `-waggables` → `waggables-theme` (`060a6608fb1a4d077a8aa165210f5c70ae4c6873`); suffix `-bulkorders` → `bulkorders-theme` (`35d3f53aa96d018b75f80e149fd3f49591878468`). Each suffix is appended to `37237-order-history-holiday-upgrades`.
- CI-only dependencies, not feature repositories: `vsf-payment-braintree` stays on `optimuspro`; `vsf-cache-varnish-1` stays on `budsies`. No ticket branch or source changes there. VSF API continues passing through the existing destination records; Magento remains the deployed prerequisite.

Adapt the focused source/test changes to each brand base without merging unrelated brand code. PRs target their corresponding bases. App `.github/scripts/resolve-pr-ci-selection.js` selects same-ticket theme branches only when they have open PRs into mapped theme bases: the Petsies-base app PR must cover the four non-Bulk theme companion PRs; the Bulk Orders app PR must cover the Bulk theme companion. Push companions and open the ready PRs before claiming app CI verifies them. Do not commit app submodule pointers or use the old Magento branch/PR. Primary branch names match across repositories; brand suffixes disambiguate variant targets within one repository. No CI edits are required.

The `.github/workflows/test_vsf1.yml` pipeline runs lint, maintained tests and builds against those actual companion branches, with payment unchanged. A default-theme green run without companion PRs is not evidence for the theme fix. Keep branch bases current through the ordinary Git workflow, not broad feature/release merges in this task.

## Risks / Trade-offs

- [The factory currently erases absent-versus-international metadata] → Retain missingness and test raw false, true, zero, one and omitted values through the factory and public preparation helper. Both cutoffs expired still leaves tagged Standard, so detection does not depend on a surviving Rush record.
- [Shared catalog projection contaminates another order] → Use immutable preparation and test domestic/international orders sharing a raw product in one list and across single-item views. This is a real supported entry path, not speculative defensive handling.
- [A form left open crosses a cutoff] → Accepted O11: no timer or new server validation. Existing refresh supplies updated choices on the next load.
- [Order data arrives after cached product data] → The existing single-item undefined-product path waits for its own order before preparing a context-specific product; no default domestic guess or cross-order state is introduced.
- [Future stores use a non-US shipping origin] → Existing storefront conventions and the bounded dev config use US. Do not generalize this ticket with new config/API work; escalate under O12 if the actual release target differs.
- [Retiring the workaround before all storefront variants ship reopens the old gap] → Keep it until both app variants and their companion themes are deployed and destination-specific verification passes. Retire it only through the release operator steps below.

## Validation and tester handoff

Implementation checks belong with the code they protect:

- App factory/preparation tests under `src/modules/*/test/unit/`: optional metadata fidelity, destination filtering before SKU collapse, both mixed-cutoff directions, tagged Standard with no matching Rush, ordinary data with supplied context, callers without context, zero-slot cards-list preservation, unchanged IDs/prices and no mutation of raw products/add-ons. Scope the new behavior with the optional context rather than changing product-page expectations.
- Theme tests beside the loaders/helper/form: exercise both loaders using a single shared raw bundle with US and international parent orders, and late order availability in the single-item loader. Test the final rendered form omits the heading when only synthetic Standard/already-purchased choices remain, retains another eligible customization, and passes that upgrade through the existing add-to-cart handler. Preserve associated-price prefetch behavior. Prefer the existing form/component public boundary over exposing internal methods.
- Run `docker compose exec -T app yarn test:unit --runInBand --runTestsByPath <focused paths>`, `yarn test:unit:maintained`, `yarn type-check`, focused ESLint and the existing CI lint/build commands for the app/theme combinations. Run all project tooling inside the documented UI container. Apply branch-specific checks to each variant; do not run a second installation in a worktree. E2E/live browser work belongs to the tester, not the tracked implementation tasks.

Required live tester flows, using non-production fixtures and the normal Rush index refresh: (1) a Holiday bundle with one destination expired and the other in Rush Delivery, two orders sharing the bundle, and each order seeing only its own options; verify both list and single-item entry points across the pair; (2) both cutoffs expired, no Production Time heading, and another upgrade can still be added to the sandbox cart; (3) unchanged product-page destination toggle and one non-Holiday alteration regression. Use a representative affected brand for the full flow and cheap smoke checks of each deployed variant; the branch matrix/unit tests provide the repeated brand coverage. Additional unchanged-phase and workaround-cleanup live checks are optional where fixtures already make them cheap.

## Migration Plan

No data migration, new index trigger or catalog/widget edit is required to deploy the code. Release both app variants and the five corresponding theme variants using the existing VueStorefront release process, after the delivered Magento destination-record prerequisite. The release owner must copy the G4 instructions below into #37237's Deployment instructions while preserving useful historical deployment notes. This spec does not update Redmine or authorize production writes.

**G4 — retire the earlier-date workaround after release verification:**

1. The separate alteration group with both Rush cutoffs at the earlier date is no longer needed once the destination-aware storefront is deployed for all affected brands. If it was never applied, leave memberships and dates unchanged.
2. In **Budsies → Holiday → Periods → Christmas 2026 → Product Groups**, inspect the actual separate group and intended main-product group; do not guess a new group ID or overwrite the main-product dates. The original mapping is #830 → Budsies #47, #831 → Selfies #46, #832/#833/#834 → Forevers + Golf Covers #48, unless the operator has intentionally reorganized it.
3. A product can belong to only one group in the period. If the separate group contains only the alteration bundles being moved, delete that separate group through the existing confirmed Admin Delete action first (do not try to save an empty group). Then add those bundles to their main-product group and save. If the separate group also contains unrelated members, remove only the moving alteration bundles, save it with its remaining members, and preserve that group. Do not delete unrelated members or groups.
4. Preserve the main-product group's existing dates exactly as displayed in Admin; the returning bundles now use those normal destination-specific dates. Let the existing group-save/delete refreshes finish and confirm the restored membership and order-destination choices. No manual new trigger, widget switch or attribute edit is part of this procedure.

Operator actions are separate approved production changes. During a delete-then-add move there is a brief unassigned interval and normal asynchronous refresh; complete the move as one operator procedure and verify its final state rather than promising atomic membership transfer the Admin does not provide.

Rollback requires the ordinary release owner's approval and matching app/theme versions. Reverting the frontend restores the old shared-list limitation. If the workaround has already been retired, the release owner must decide whether to reapply it through the existing Admin procedure before/alongside rollback; code rollback does not automatically edit memberships or dates.
