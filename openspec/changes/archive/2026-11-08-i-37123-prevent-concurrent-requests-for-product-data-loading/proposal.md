# Proposal

## Why

The origin report records five concurrent loads of the Forevers bundle product on `/forevers-pet-plush/` (#33413 note #231423); D1 adopts the existing PR's request-sharing and product-detail preservation scope. D2 requires correcting that PR's positional array merge, and D4 clarifies that returned arrays replace membership while omitted fields and arrays stay.

The branch retains pending-request sharing and catalog MERGE writers, and now calls `mergeProductData` instead of the positional lodash merge present at specification commit `e21c3163a` (`core/lib/search.ts:15–30`; `core/modules/catalog/store/product/actions.ts:126–128,165–167`; `core/modules/catalog/store/product/mutations.ts:105–112`; `core/modules/catalog/helpers/mergeProductData.ts:6–34`). Category data varies with both UI and API configuration: the UI template explicitly omits whole detail arrays and child fields, while the default UI include-list projection receives full customization/bundle identities through the API's additive filter (`config/local.json.template:447–477`; `config/default.json:239–307`; API `config/local.json.template:44–46,288–352`, `src/lib/elastic.js:35–61` at `fbb5408ae6dd1dc68c789b35a5a3c2febd914492`). Neither form permits associating array items by position. D5 establishes this contract from local source, not a new live production response.

## What Changes

- Preserve coalescing of identical pending catalog searches, independent result copies per caller, and cleanup after success or failure (D1).
- Preserve the one-value `in` shape for single-product lookups, with unchanged product results and compatibility with equivalent list searches (D1).
- Preserve browser-after-mount product loading and loaded-dictionary reuse in the PayPal Pay Later and Affirm blocks (D1).
- Keep field projection in request identity and caller-specific post-processing outside the shared search (D1).
- Catalog merges preserve omitted fields, nested fields and whole omitted arrays. A returned array supplies its membership and order, including clearing with `[]`; absent old members are removed. Corresponding customization values, bundle options/links and configurable children keep omitted detail by domain identity, never by position. This prevents duplicate Production Time values and wrong link-product associations (D1, D2, D4).
- Explicit writes still replace the entry, and bundle/grouped prefetches still request the linked-SKU count instead of relying on the default page size (D1).

## Capabilities

### New Capabilities
- `catalog-search-request-deduplication`: coalescing of concurrent identical catalog search requests, isolation of each caller's result, and field projection as part of request identity.
- `catalog-product-data-merge`: preserving omitted product detail while refreshing array membership and enriching corresponding items without positional mixing.

### Modified Capabilities
<!-- None -->

## Impact

- Code:
  - `core/lib/search.ts` (`quickSearchByQuery`);
  - `core/data-resolver/ProductService.ts` (`getProduct` filter operator);
  - `core/modules/catalog/helpers/associatedProducts/setBundleProducts.ts` and `setGroupedProduct.ts` (prefetch size);
  - `src/modules/payment-affirm/components/storyblok/AffirmMonthlyPayment.vue` and the theme `components/storyblok/PayPalPayLaterMessage.vue` (product loading);
  - `core/modules/catalog/store/product/` (existing MERGE mutation and catalog writers) and `core/modules/catalog/helpers/mergeProductData.ts` for the revised merge;
  - unit tests for these.
- Keep SET as a replacement and retain the three catalog MERGE writers (`core/modules/catalog/store/product/mutations.ts:102–112`; `actions.ts:126–128,165–167`; `core/modules/catalog/index.ts:31–35`). The multi-product page's explicit transformed write remains unchanged (`src/themes/petsies-capybara/helpers/use-multi-products-page.ts:48–57`).
- Other catalog consumers require no call-site changes. No API/configuration changes, new dependencies or data migration are planned. The API checkout is a read-only source for F1.2, not an affected implementation repository (D5).
- Preserve the existing process-level sharing and complete cache key, with cloned results per caller (`core/lib/search.ts:15–30,57–77`).
- Out of scope:
  - Requests that differ in shape but target the same product (a SKU filter vs an ID filter, or extra filters such as `status`) are not merged into one request. Only the `eq`/`in` operator difference for the same key is aligned.
  - A single-product lookup still persists a new query cache entry; previously persisted `eq` entries miss once and are refilled.
  - Consumers that check only dictionary entry existence remain unchanged (D1; for example `src/modules/shared/composables/use-text-directives.ts:230–242`).
  - Non-catalog requests are not deduplicated.

Sources: D1–D5 are recorded in ticket #37123's `decisions.md`; API revision/configuration evidence is in `task-management/tickets/37123-prevent-concurrent-product-requests/queries/09-local-api-configuration.md`. The full-change path and existing app/theme branch locations remain as confirmed by D3 and approach review 1.
