# Design

## Context

See proposal.md for the ticket's motivation and scope. This design is synced to the working-tree implementation against specification commit `e21c3163a`, including the untracked helper/tests and the F3.1 removal recorded in scope review 1; no new feature branch is introduced. D1–D5 refer to #37123's recorded decisions. App paths below are relative to the app repository; `API@fbb5408` means `/home/andre/projects/budsies/store-ui/api` at image-tag commit `fbb5408ae6dd1dc68c789b35a5a3c2febd914492`, inspected through local Git objects only (D5).

The current app already has pending-search sharing, independent result copies and the existing hashed query-cache read path (`core/lib/search.ts:15–30,57–93,109–147`). Product preparation/configuration follows search, separately for each caller (`core/data-resolver/ProductService.ts:58–97`); bundle attachment and configurable-child selection can mutate the returned data (`core/modules/catalog/helpers/configure/configureProductAsync.ts:47–88`).

Catalog writes use MERGE from `findProducts`, `single` and the bundle-prefetch hook (`core/modules/catalog/store/product/actions.ts:126–128,165–167`; `core/modules/catalog/index.ts:31–35`). MERGE now calls the pure `mergeProductData` helper (`core/modules/catalog/store/product/mutations.ts:7,105–112`); the positional lodash merge present at `e21c3163a` has been replaced. The helper's scoped collection map and incoming-only array traversal implement D2/D4 without retaining absent members (`core/modules/catalog/helpers/mergeProductData.ts:6–27`).

### Configured response shape, not frontend types alone

The API template at the image-tag revision enables additive request filtering (`API@fbb5408:config/local.json.template:44–46`; `src/lib/elastic.js:35–61`). Its base include list contains whole `customizations`, `bundle_options`, `product_links` and the child SKU; these identity fields are not excluded (`config/local.json.template:288–352`). The API startup script generates local configuration from that template (`docker/vue-storefront-api/vue-storefront-api.sh:4–5`). Its default-only filter value is false, so the template matters (`config/default.json:46–47`).

Two UI projections are checked in:

| UI configuration | Shape under the API template contract |
| --- | --- |
| `config/default.json:239–307`: include list with `*sku`, excludes gallery/detail fields | API whole-array includes preserve customization IDs and complete bundle option/link identities when those arrays are returned; this is not the sku-only shape produced by a filter-disabled API. |
| `config/local.json.template:447–477`: empty include list, explicit detail exclusions | Whole `customizations`, `bundle_options`, `product_links`, `custom_options` and `configurable_options` are omitted; configurable children keep SKU while gallery and selected stock detail are excluded. API inclusion does not cancel explicit request exclusions. |

Full product projection is also configuration-driven (`config/local.json.template:516–519`; `core/modules/catalog/helpers/search.ts:70–78`). `getProducts` defaults bundle prefetch to `!isServer`, while `getProduct` requests it explicitly (`core/data-resolver/ProductService.ts:22–38,149–160`). A non-prefetching load therefore lacks link `product` enrichment even when the API returns the option/link arrays.

Evidence and limits: `task-management/tickets/37123-prevent-concurrent-product-requests/queries/09-local-api-configuration.md` and `09-local-api-evidence.txt`. The relevant tracked API files are unchanged between the image-tag commit and local HEAD. This proves the source/configuration contract selected by D5, not a fresh production response or the absence of live runtime overrides. Do not add runtime configuration detection or missing-key recovery to compensate for a producer/configuration outside that contract (F1.2; handling.md step 2).

The multi-product page explicitly SETs a transformed product (`src/themes/petsies-capybara/helpers/use-multi-products-page.ts:48–57`). The transform filters rush choices and inserts a synthetic Standard ID (`src/modules/customization-system/helpers/update-product-production-time-customization-data.ts:22–30,66–105`). Product-page preparation rebuilds these choices before rendering (`src/themes/petsies-capybara/helpers/use-product-page.ts:31–54`), so identity-based retention would not itself leave that page's positional duplicates unfixed; instead it would retain synthetic/unfiltered membership in dictionary consumers. F1.1 corrects this distinction, and D4 selects removal on the next returned array.

Correct dictionary detail remains important because the product page reads its entry directly and the bundle quantity limit reads the selected/default link's product (`src/themes/petsies-capybara/pages/Product.vue:275–284`; `helpers/get-product-max-sale-quantity.function.ts:21–38` in that theme).

## Goals / Non-Goals

**Goals:**
- One backend request per distinct catalog search in flight, for every catalog consumer, without changing call sites.
- Omitted fields stay on the product and corresponding surviving items, while every returned array has the new membership/order (D1, D2, D4).

**Non-Goals:**
- Merging searches that differ in shape but resolve to the same product (a SKU filter vs an ID filter, `size: 1` vs a batched `sku in [...]`). Decision 6 only removes the `eq`/`in` operator difference for the same key.
- Reusing an in-flight full-data request for a list-projection request.
- Changing dictionary-existence checks into completeness checks (D1; example: `src/modules/shared/composables/use-text-directives.ts:230–242`).
- Adding grouped-link product enrichment to the dictionary (D1); the grouped hook currently only processes attribute metadata (`core/modules/catalog/index.ts:35`).
- Deduplicating non-catalog requests (for example `budsies/fetchStatisticValuesByMetric`).
- Configuring or changing the API, repairing persisted data, introducing malformed-input recovery, or performing further production access (D3, D5).

## Decisions

### 1. Coalesce in `quickSearchByQuery()`, keyed by `cacheKey`

Retain the module-level `Map<string, Promise<SearchResponse>>`, keyed by the complete existing `cacheKey`, and its `finally` deletion. A caller finding an entry awaits it instead of calling the adapter. The shared work remains adapter search, result processing and cache population (`core/lib/search.ts:15–30,75–77,109–117`). Source: D1.

Reusing `cacheKey` keeps a single definition of "identical request". Once a request completes, the query cache already treats such requests as interchangeable.

Alternatives considered:
- **A pending-promise map in `useTextDirectives` or in components.** Fixes only one caller family.
- **An entity-level pending registry (by SKU/ID) in the product store.** It would merge different query shapes, but it means migrating every call site, resolving ID↔SKU identity before the product is known, and tracking which projection and prefetch each pending load will produce. That is exactly the detail-blocking risk Decision 2 avoids.
- **Dedup in `findProducts` / `ProductService.getProducts`, or in the two search adapters.** The results are richer there, or the logic is duplicated, with no added coverage.

### 2. Field projection stays in the identity; post-processing stays per caller

`cacheKey` includes `_sourceInclude`/`_sourceExclude` (`core/lib/search.ts:68–77`). Resolve full/list field lists through the existing configuration path rather than assuming every full load literally sends `[]` (`core/modules/catalog/helpers/search.ts:70–78`). Requests with different projections remain separate even if the API's base include list overlaps them. Source: D1.

The shared result is the search result-processor output (`core/lib/search.ts:109–117`). Keep preparation, prefetch/configuration and tax calculation per caller (`core/data-resolver/ProductService.ts:74–97`; `core/modules/catalog/store/product/actions.ts:124,160`). A prefetching caller still gets its requested link products. Source: D1.

Reusing a differently projected full request for a list caller would require new projection-subset logic and is outside D1's identical-request scope.

### 3. Clone the shared result for every caller

Keep `cloneDeep(result)` for every caller, including the initiator (`core/lib/search.ts:21–30`). Caller configuration differs (`core/data-resolver/ProductService.ts:82–97,149–160`) and is mutable (`core/modules/catalog/helpers/configure/configureProductAsync.ts:47–88`), so sharing result objects would mix caller detail. Storage already clones cached values (`core/lib/store/storage.ts:158,192,328`). Preserve each waiter's existing error path and cleanup; do not add a new retry policy (`core/lib/search.ts:25,125–147`). Source: D1.

The map remains module-level, including during concurrent SSR renders. Keep the complete existing cache identity, including store and configured group identity, and caller copies (`core/lib/search.ts:15–30,57–77`); do not redesign its dimensions. Source: D1.

### 4. Preserve omitted detail; replace array membership and match enrichment by identity

The existing MERGE mutation calls the focused pure helper `core/modules/catalog/helpers/mergeProductData.ts`, retaining the mutation type, its three writers and `Vue.set` (`core/modules/catalog/store/product/mutations.ts:7,105–112`; `actions.ts:126–128,165–167`; `core/modules/catalog/index.ts:31–35`). Source: D1, D2, D4; pure helpers and synchronous reactive mutations follow `AGENTS.md:82–87`.

For an existing entry, the helper deep-clones the old graph and visits only incoming properties (`core/modules/catalog/helpers/mergeProductData.ts:16–19`). Missing properties retain the old value; returned objects recurse, and returned scalar/null values replace it (`:28–34`). A wholly omitted array stays. A present array, including `[]`, supplies membership and order: the helper maps incoming members only for recognized collections and clones other incoming arrays as whole values (`:21–27`). Neither input is mutated. This is the implementation of D1/D2/D4, not a union of old and incoming members.

For the following domain collections, enrich each incoming item only from the corresponding old item, then recurse with the same membership rule:

| Collection | Matching key and scope | Why it survives the inspected projections |
| --- | --- | --- |
| `customizations[]` | `id` within the product | API includes the whole array when not explicitly excluded. |
| `customizations[].optionData.values[]` | `id` within the same customization | Whole customization includes values; `OptionValue.id` is required, `sku` is optional, and synthetic Standard has an ID but no SKU. |
| `bundle_options[]` | `option_id` within the product | API includes the whole option array when not excluded. |
| `bundle_options[].product_links[]` | `sku` within the corresponding bundle option | API includes full links; associated-product attachment already uses SKU. Never use the link's `option_id`. |
| `configurable_children[]` | `sku` within the product | API explicitly includes child SKU and neither checked-in UI projection excludes it. |

Key evidence: the configuration subsection above and `queries/09-local-api-configuration.md`; app `core/modules/catalog/helpers/associatedProducts/setBundleProducts.ts:38–43`, `core/modules/catalog/types/BundleOption.ts:3–24`, `src/modules/customization-system/types/customization.interface.ts:7–24`, `option-value.interface.ts:5–21`. For customization values, `id` is required and `sku` optional (`option-value.interface.ts:5–8`); synthetic Standard supplies an ID without a SKU (`src/modules/customization-system/helpers/update-product-production-time-customization-data.ts:22–29`). Approach review 1 E4 found no repeated value IDs in the imported local catalog, and E5 found unique link SKUs and nullable link `option_id`; these are not live production measurements. Holiday location records share one underlying option-value ID (`openspec/specs/production-time-option-presentation/spec.md:160–162`); that scenario does not establish two catalog option values with the same SKU and is not the rationale for this key.

The collection map implements exactly these five kinds (`core/modules/catalog/helpers/mergeProductData.ts:6–14`). Configurable-child items re-enter product context (`:10`), and a bundle link's associated `product` object does the same (`:28–32`), so nested product collections use the same rules. Other arrays, such as `category_ids`, `disabled_upgrades` and whole gallery arrays, take a deep-cloned incoming value without item enrichment (`:27`); no stable partial-item enrichment contract was established for them (`core/modules/catalog/types/Product.ts:17–24,40,84–92`). This prevents positional mixing in every remaining array (D2, D4). There is no universal key guessing, old-member concatenation, positional fallback or missing-key recovery. The checked-in API/configuration is our producer; a discrepancy belongs there (F1.2; handling.md step 2).

F3.1's unsourced old-value type-change recovery has been removed: object recursion now uses `existing[key] || {}` solely for a missing old field, matching the omitted-array/new-item defaults at `:24–25` (`core/modules/catalog/helpers/mergeProductData.ts:32`; `12-scope-review1.response.md`). The incoming value's array/object/scalar dispatch remains, but the helper does not check the old value for an array/scalar-to-object type change. No requirement or test for producer type-mismatch recovery is added.

If a SKU has no entry, the mutation keeps the existing store-as-returned behavior; otherwise it stores the helper's new graph using `Vue.set` (`core/modules/catalog/store/product/mutations.ts:105–112`). The helper reuses `cloneDeep` without a new dependency (`core/modules/catalog/helpers/mergeProductData.ts:1,17,27`). Unit tests exercise input immutability and the reactive update, separately from browser acceptance (`core/modules/catalog/test/unit/helpers/mergeProductData.spec.ts:16–22`; `core/modules/catalog/test/unit/store/product/mutations/productBySku.spec.ts:79–93`). No extra projection/fullness flag is passed by `findProducts`; the checked-in shapes provide either omitted arrays or corresponding item keys (D1, D5).

Consequences required by D1, D2 and D4:
- Category projection omitting whole arrays keeps them; a returned child array keeps omitted gallery/stock only on the corresponding surviving child.
- A returned non-prefetched link keeps its own old `product`, but a new SKU cannot inherit another link's product. Removed options/links and removed children disappear.
- A raw Production Time load after the multi-product SET removes synthetic Standard if absent from the returned values. The next frontend preparation still filters eligible rush choices and builds Standard once; it does not rely on stale membership (`src/modules/customization-system/helpers/update-product-production-time-customization-data.ts:66–105`).

Alternatives rejected:
- **Positional lodash merge:** the defect D2 rejects; it can duplicate a filtered value or transfer link detail to a different SKU.
- **Identity union retaining missing members:** D4 rejects that membership, including stale Standard, removed links and unavailable variants.
- **Replace every object array wholesale:** loses the omitted detail D1 requires on projected children and non-prefetched links.
- **Shallow merge or `defaultsDeep`:** respectively drops omitted nested detail or prevents returned values from refreshing. Neither meets D1.

### 5. Explicit writes keep replacing the entry

Keep `PRODUCT_SET_PRODUCT_BY_SKU` as a plain replacement (`core/modules/catalog/store/product/mutations.ts:102–104`). The multi-product page uses it after transforming rush values (`src/themes/petsies-capybara/helpers/use-multi-products-page.ts:48–57`). This explicit write and its intentional removals are not converted to MERGE. Source: D1.

Retain MERGE in the bundle hook because its direct `ProductService.getProducts` call is a catalog load (`core/modules/catalog/helpers/associatedProducts/setBundleProducts.ts:21–36`; `core/modules/catalog/index.ts:31–35`). It preserves an omitted list-only field such as `sgn` when present; the API signature processor is conditional on the original request (`API@fbb5408:src/processor/product.js:79–104`), so do not assume every list supplies it. The grouped hook still does not write dictionary products (`core/modules/catalog/index.ts:35`). Source: D1.

### 6. Single-product lookups use the `in` operator

Keep the existing `{ in: [options[key]] }` lookup with size 1 (`core/data-resolver/ProductService.ts:149–160`). D1 requires the same product result and compatibility with an equivalent one-value list search. The Forevers payment/structured-data blocks for product `73` remain the approved integration acceptance case; do not convert that recorded case into a claim of a newly measured page configuration. Verify ID and SKU query shapes with the existing resolver tests (`core/data-resolver/test/unit/ProductService.spec.ts:49–70`).

Alternatives considered:
- **Rely only on a product dictionary check in the PayPal and Affirm blocks.** On client-side navigation all blocks start before any response, so a dictionary check does not prevent the duplicate; it only helps hydrated SSR state. Decision 7 adds the check for that case, on top of this decision.
- **Change the Storyblok blocks to `eq`.** Fixes one page while every other `in`-by-ID caller keeps a separate request shape.

### 7. PayPal and Affirm blocks load in the browser and reuse the dictionary

Retain browser `mounted` loading and ID-dictionary reuse (`src/themes/petsies-capybara/components/storyblok/PayPalPayLaterMessage.vue:64–89`; `src/modules/payment-affirm/components/storyblok/AffirmMonthlyPayment.vue:53–81`). Reuse the existing getter rather than another cache (`core/modules/catalog/store/product/getters.ts:29–37`). `mounted` also keeps PayPal's `v-if="amount > 0"` from changing its hydration markup before mounting (theme `PayPalPayLaterMessage.vue:9–15`). Preserve Affirm's item watcher (`AffirmMonthlyPayment.vue:103–106`). Source: D1.

Alternatives considered:
- **`serverPrefetch` in both blocks.** Their output is not rendered during SSR, so prefetching only adds server work.

### 8. Linked product prefetches size the query by their SKU count

Retain `size: skus.length` in both helpers (`core/modules/catalog/helpers/associatedProducts/setBundleProducts.ts:16–34`; `setGroupedProduct.ts:15–32`) rather than the resolver default of 50 (`core/data-resolver/ProductService.ts:22–26`). Their returned links attach products by SKU (`setBundleProducts.ts:38–43`; `setGroupedProduct.ts:36–39`). Source: D1's explicit >50 requirements.

No SKU deduplication, empty-list guard or extra batching is added. The requested count is not smaller than the number of distinct requested products, and the existing search size fallback stays unchanged (`core/lib/search.ts:49–52`). The imported local catalog has 50 Custom Pajamas links according to approach review E5; production counts were not checked in this revision.

## Risks / Trade-offs

- [R1: Different query shapes for one product still fetch separately] → Accepted by D1; no entity-level coalescer. Likelihood: no data; ordinary impact. Recorded in the ticket's `risks.md`.
- [R2: Dictionary-existence consumers still treat a list entry as loaded] → Accepted by D1; completeness checks remain out of scope. Likelihood: no data; ordinary impact. Recorded in `risks.md`; this does not accept new merge corruption.
- [R3: Persisted exact-match lookup cache keys miss after the `in` shape change] → Accepted by D1; retain normal cache miss/refill behavior. Likelihood: no data; ordinary impact. Recorded in `risks.md`.
- [Incoming `null` refreshes the value rather than preserving old data] → Preserve the approved provided-value rule (D1); omission, not null, represents a projected-out field.
- [Copying results and merged graphs allocates additional objects] → Reuse existing `cloneDeep`/`Vue.set` patterns (D1); no unmeasured timing claim, optimization layer or memory limit is added.
- [Unknown live runtime configuration overrides] → D5 requires local revision/configuration evidence, not another production query. The source contract is explicit above; this is an evidence limitation, not acceptance of a corrupt merge or authorization to add defensive fallback behavior.

The previous accepted risk that catalog loads retain removed array members is deleted: D4 explicitly supersedes it. Positional merging is a rejected mechanism, not an accepted trade-off.

## Migration Plan

No API, configuration or data migration is introduced. D3 keeps work on the existing app/theme PR branches and preserves local merges and unrelated files. The implementation delta and F3.1 removal have been reviewed, but tasks 4.1–4.3 remain open. The latest recorded targeted run has 34 passing tests and two unchanged `findProducts` cache-tag failures reproduced on the specification baseline; type-check and lint pass, with no changed-file lint diagnostics (`12-scope-review1.response.md`; `11-bug-review1.md`). Those results do not establish request counts, SSR/hydration/payment amounts, retained-detail navigation or the reload/selection cycle (`10-resume3-observations.md`). This spec-sync round only updates artifacts and validates them; it does not run acceptance, change services, deploy or commit. Deployment and rollback remain separate authorized workflows.
