# Design

## Context

Every product read in the storefront ends up in `quickSearchByQuery()` (`core/lib/search.ts`): `product/findProducts`, `product/single` and `product/loadProduct` go through `ProductService`, then `getProducts()`, then `quickSearchByQuery()`.

`quickSearchByQuery()` already has a request-level cache. It hashes the `SearchRequest` (including `_sourceInclude`/`_sourceExclude`) with `sha3_224` into `cacheKey` and uses `StorageManager.get('elasticCache')`, whose `getItem`/`setItem` `cloneDeep` the values. The gap is the time between a cache miss and the response being stored, when concurrent identical calls all miss. On the Forevers page this happens because every `TextComponent` runs `useTextDirectives().processDirectivesInText()` in `serverPrefetch` and `beforeMount`. Each one checks `product/getProductBySkuDictionary`, finds nothing, and dispatches the same `findProducts` (`sku in [ForeversDog_bundle]`, `size: 1`).

`findProducts` and `single` then commit every product to `PRODUCT_SET_PRODUCT_BY_SKU`, which does `Vue.set(state.productBySku, product.sku, product)`. That is a full replacement. The detail of a product varies by load:

| Load | Field projection | Bundle link products |
|---|---|---|
| `single` / `loadProduct` (product page, PayPal, Affirm) | full | yes |
| `findProducts`, client defaults (text directives, Banner) | full | yes |
| `findProducts` with `prefetchGroupProducts: false` (Storyblok blocks, related products), and any SSR `findProducts` | full | no |
| `category-next/loadCategoryProducts` / `loadMoreCategoryProducts` (theme `Category.vue`) | `entities.productList` (excludes `customizations`, `bundle_options`, `product_links`, `media_gallery`, `stock.*`, `configurable_children[].media_gallery`/`stock.*`, …) | no |

Consumers that read these details from the dictionary:
- `Product.vue:269`: `setCurrentProduct` reads the dictionary, and `:237` uses `configurable_children[].media_gallery`;
- `GiftCards.vue:461`;
- customization price composables, which read `customizations`;
- `m-product-option-bundle.vue`, which reads link products;
- `get-product-max-sale-quantity.function.ts`, which reads link products and `stock.max_sale_qty`;
- `use-related-products.ts:142`, which already treats a missing `media_gallery` as not fully loaded.

## Goals / Non-Goals

**Goals:**
- One backend request per distinct catalog search in flight, for every catalog consumer, without changing call sites.
- A dictionary entry is never less detailed than the most detailed load of that product.

**Non-Goals:**
- Merging searches that differ in shape but resolve to the same product (a SKU filter vs an ID filter, `size: 1` vs a batched `sku in [...]`). Decision 6 only removes the `eq`/`in` operator difference for the same key.
- Reusing an in-flight full-data request for a list-projection request.
- Changing consumers that check `if (!dictionary[sku])` before loading so that they look for a specific detail. They already treat list-projection entries as loaded today, and the ones found only read fields the projection keeps.
- Grouped-product links (`product_links[].product`). The theme only references `grouped` in legacy template conditions.
- Deduplicating non-catalog requests (for example `budsies/fetchStatisticValuesByMetric`).

## Decisions

### 1. Coalesce in `quickSearchByQuery()`, keyed by `cacheKey`

Add a module-level `Map<string, Promise<SearchResponse>>` of in-flight searches, keyed by the existing `cacheKey`. Wrap the existing `searchAdapter.search(Request).then(resultProcessor + cache.setItem)` block in a shared promise stored under that key, and delete the entry in `finally`. A caller that finds an entry awaits it instead of calling the adapter.

Reusing `cacheKey` keeps a single definition of "identical request". Once a request completes, the query cache already treats such requests as interchangeable.

Alternatives considered:
- **A pending-promise map in `useTextDirectives` or in components.** Fixes only one caller family.
- **An entity-level pending registry (by SKU/ID) in the product store.** It would merge different query shapes, but it means migrating every call site, resolving ID↔SKU identity before the product is known, and tracking which projection and prefetch each pending load will produce. That is exactly the detail-blocking risk Decision 2 avoids.
- **Dedup in `findProducts` / `ProductService.getProducts`, or in the two search adapters.** The results are richer there, or the logic is duplicated, with no added coverage.

### 2. Field projection stays in the identity; post-processing stays per caller

`cacheKey` includes `_sourceInclude`/`_sourceExclude`. Full loads send `[]` through `getOptimizedFields()`, while list loads send the `entities.productList` field lists, so a full-data caller never waits on a list request. This property is what makes request-level coalescing safe for detail. It is a spec requirement, so the key must not be "normalized" later.

The shared result is the raw `resultProcessor` output. Prefetching (`setBundleProducts`, which itself goes through `quickSearchByQuery()`), configuration and tax calculation still run separately for each caller with its own options. A prefetching caller that shares a request with a non-prefetching one still gets link products.

The reverse case, a list request reusing an in-flight full request, would save little and needs subset logic, so it is rejected.

### 3. Clone the shared result for every caller

Each caller, including the initiator, receives `cloneDeep(result)` (`lodash-es/cloneDeep`, already used in core). Callers with the same request still post-process differently: `single` assigns a child `configuration`, while `findProducts` uses its own options. `prepareProducts`, `configureProducts` and `calculateTaxes` change products in place, so a shared object would leak one caller's processing into another's. This matches what a cache hit returns. On failure, the rejection goes through each waiter's existing `catch` branch, and the `finally` deletion lets the next call retry.

The map is module-level, so concurrent SSR renders also share identical requests. That is safe because SSR is stateless, `cacheKey` includes the store code, and every caller gets its own copy.

### 4. Catalog loads deep-merge into the existing entry

Add a `PRODUCT_MERGE_PRODUCT_BY_SKU` mutation and commit it from `findProducts` and `single`:

```ts
const existingProduct = state.productBySku[product.sku]
Vue.set(state.productBySku, product.sku, existingProduct ? merge({}, existingProduct, product) : product)
```

`lodash-es/merge` recurses into objects and merges arrays by index. Anything the loaded product lacks stays, and anything it contains takes the loaded value. One rule covers every load order:
- A Category list load leaves out excluded fields, so `customizations`, `bundle_options`, `stock.max_sale_qty` and `configurable_children[].media_gallery` of a full entry stay.
- A full load after a list load adds those fields, including nested ones, because `stock` and `configurable_children` items are merged rather than kept or replaced as a whole.
- A load without bundle prefetch has links without `product`, so prefetched link products stay.
- Values both loads contain take the later value, so entries do not go stale.

The merge target is a new object, so the stored entry is replaced, new fields are reactive, and the previous entry is not changed. Vue's non-enumerable `__ob__` is not copied.

The decision does not depend on which fields a load requested, so `findProducts` does not need to tell projected and full loads apart.

Alternatives considered:
- **Shallow merge in a direction chosen per load (projected loads fill gaps, full loads win).** An existing `stock` object or `configurable_children` array is kept or replaced as a whole, so a full load after a list load loses nested fields. It also needs a flag on every write and separate handling of bundle link products.
- **`defaultsDeep` (existing values win).** Never refreshes values once they are set.

### 5. Explicit writes keep replacing the entry

`PRODUCT_SET_PRODUCT_BY_SKU` stays a plain replacement. It is committed outside catalog loads on purpose: `use-multi-products-page.ts:56` writes a product whose Production Time values were filtered by rush availability, and a merge by index would bring the removed values back.

The `afterSetBundleProducts` hook (`core/modules/catalog/index.ts`) stores the products prefetched for bundle option links. That prefetch calls `ProductService.getProducts()` directly instead of `findProducts`, but it is still a catalog load, so the hook commits `PRODUCT_MERGE_PRODUCT_BY_SKU`. With a replacement, a full prefetch would drop fields an earlier load added, for example `sgn`, which the API returns only for requests with `_source_exclude` (Category list loads). Grouped product prefetches do not write to the dictionary. After this change, every catalog load merges, and `use-multi-products-page.ts` is the only writer that replaces.

### 6. Single-product lookups use the `in` operator

`ProductService.getProduct()` (behind `product/single` and `loadProduct`) filters with `{ in: [options[key]] }` instead of `{ eq: options[key] }`.

On client-side navigation to the Forevers page, three Storyblok blocks load product `73` in the same mount cycle with an empty store: `PayPalPayLaterMessage` and `AffirmMonthlyPayment` call `product/single` with key `id`, and `ProductStructuredData` calls `findProducts` with `id in ["73"]`. Both paths use `size: 1`, `from: 0`, `sort: ''` and the default field projection, so the operator was the only difference in `cacheKey`, and Decision 1 could not coalesce them. With `in`, the `SearchRequest` is byte-identical and the three calls share one request.

`storefront-query-builder` maps both `eq` and `in` to a `terms` filter, so the Elasticsearch query and its results do not change for any key (`sku`, `id`, `url_key`). `single` rejects an empty key value, and core callers pass scalar strings, so the array always holds one value. `getProductsIdsFromSearchQuery` already reads `in` for cache tags.

Alternatives considered:
- **Rely only on a product dictionary check in the PayPal and Affirm blocks.** On client-side navigation all blocks start before any response, so a dictionary check does not prevent the duplicate; it only helps hydrated SSR state. Decision 7 adds the check for that case, on top of this decision.
- **Change the Storyblok blocks to `eq`.** Fixes one page while every other `in`-by-ID caller keeps a separate request shape.

### 7. PayPal and Affirm blocks load in the browser and reuse the dictionary

`PayPalPayLaterMessage` and `AffirmMonthlyPayment` loaded their product in `created`. During SSR that sent a request nobody awaited: the blocks render nothing useful on the server (PayPal has `v-if="amount > 0"`, Affirm's widget is initialized by its browser script). In the browser, `created` ran again and always dispatched `product/single`, even when the SSR state already held the product.

Both blocks now load in `mounted`. Before dispatching `product/single`, they take the product from `product/getProductByIdDictionary` when it is there (for example, put into the SSR state by `ProductStructuredData`). `mounted` rather than `beforeMount`: the PayPal message is under `v-if`, so having the product before the hydration render would produce markup the server did not render. The `item` watcher of the Affirm block keeps reloading through the same method, so editor preview changes still apply.

Alternatives considered:
- **`serverPrefetch` in both blocks.** Their output is not rendered during SSR, so prefetching only adds server work.

### 8. Linked product prefetches size the query by their SKU count

`setBundleProducts()` and `setGroupedProduct()` load all linked products with one `sku in [...]` query through `ProductService.getProducts()`, but did not pass `size`, so the default of 50 applied. A bundle with more than 50 linked products left the rest of its `product_links` without `product`, which breaks the option's product, price, and max-quantity data. The Custom Pajamas bundle links exactly 50 SKUs today.

Both helpers now pass `size: skus.length`. The SKU list can repeat a SKU that appears in several options, so its length is never below the number of distinct products, and no deduplication is needed. An empty list still falls back to the default size in `quickSearchByQuery()`, but those helpers only run for products that have links.

## Risks / Trade-offs

- [Persisted query cache entries for single-product lookups change key] → They miss once after deployment and are refilled; the cache already tolerates misses.

- [Different query shapes for the same product are still fetched separately] → Accepted as a non-goal. The dominant duplication (N identical directive or block queries) is removed.
- [A catalog load never removes fields or array items] → Arrays are merged by index, so a load that legitimately returns fewer items (for example `configurable_children` with `products.filterUnavailableVariants`, which is off) keeps the extra items of the existing entry. Writes that must remove data use `PRODUCT_SET_PRODUCT_BY_SKU`.
- [`null` in a later load overwrites an existing value] → That is a refresh of the value; list projections omit excluded fields rather than sending `null`.
- [Extra `cloneDeep` per caller and a new object per dictionary write] → Each costs about the same as the clone `cache.setItem` already does on every response, and much less than a network round trip.

## Migration Plan

No data or config migration. Deploy normally; to roll back, revert the commit. Dictionary state is per session and per SSR request, so nothing persists across versions.
