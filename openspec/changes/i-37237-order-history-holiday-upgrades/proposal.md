# Proposal

## Why

Magento #37237 shipped Holiday group support for alteration bundles in `17a3dca`, but the order-history alteration form still merges both destinations' Rush records and can leave an empty Production Time heading. The operator now requests those two storefront fixes while Holiday 2026 is active.

## What Changes

- Prepare alteration Production Time choices from the owning order's shipping destination before merging Holiday records by SKU, on both the order-history list and single-item customize-upgrades entry points.
- Hide the entire Production Time section, including its heading, when no selectable upgrade remains after destination, Holiday and existing purchased-option filtering. Other upgrades remain purchasable.
- Preserve ordinary product-page location toggles, non-Holiday alteration behavior, option identities/prices, and the alteration form's existing labels and displayed-but-not-enforced counter.
- Document retiring the optional earlier-date group workaround after the destination-aware storefront release, using existing Magento Admin operations only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `production-time-option-presentation`: Add order-owned Holiday destination selection, empty alteration-section suppression, and isolation from ordinary purchase flows across all affected storefronts. Existing timeline-widget contracts remain unchanged.

## Impact

- Two implementation repositories: `BudsiesApp/vue-storefront` (shared Rush response/preparation code) and `BudsiesApp/vsf-capybara` (both alteration loaders and the alteration form's final customization filter).
- Primary feature branch in both: `37237-order-history-holiday-upgrades`, based on updated `petsies-theme`. Also prepare the Bulk Orders app variant and all five theme variants listed in `design.md`; their relevant source files currently match, but brand differences must be preserved.
- The app's CI builds companion theme branches selected by issue-number-prefixed open PRs and the unchanged payment branch. No payment, VSF API, Magento, dependency, schema, API endpoint, checkout or server-side cutoff-enforcement change is planned.
- New OpenSpec change, not a reopening of the archived Magento change or its merged branch/PR #514. R1–R6/G1–G3 remain delivered history; this plan implements R7–R9 and documents G4.
