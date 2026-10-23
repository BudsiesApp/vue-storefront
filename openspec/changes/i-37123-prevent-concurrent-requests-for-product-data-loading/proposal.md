# Proposal

## Why

Product data is reused only after it reaches the Vuex store (`product/getProductBySkuDictionary`) or the catalog query cache (`elasticCache`). Several components that need the same missing product all pass that check before the first response arrives, so each sends its own identical catalog request. On the Storyblok Forevers page (`/forevers-pet-plush/`), five requests for the `ForeversDog_bundle` product go out. Each rich-text block with a `{{productPrice(...)}}` directive (`TextComponent` → `useTextDirectives`) loads independently during SSR `serverPrefetch` and again on client `beforeMount`.

The product dictionary has a related problem: every write fully replaces the entry, so whichever load finishes last decides how much detail is kept. Loads differ in detail along two axes:

- **Field projection.** The Category page (`category-next/loadCategoryProducts`) loads products with the `entities.productList` projection. It drops `customizations`, `bundle_options`, `product_links`, `media_gallery`, `stock.max_sale_qty`, `configurable_children[].media_gallery`, and more.
- **Bundle prefetch.** Loads with `prefetchGroupProducts: false` (Storyblok product blocks, every SSR `findProducts`) have no `bundle_options[].product_links[].product`.

When a less detailed load finishes last, it removes data that the product page (`setCurrentProduct` reads the dictionary), customization pricing, the bundle options UI, and the cart max-quantity check depend on.

## What Changes

- Identical catalog search requests that are already in flight are coalesced. A later caller waits for the pending request instead of sending a new one. Each caller receives its own copy of the result, exactly like a catalog query cache hit. A request that has settled, successfully or not, is no longer shared.
- Single-product lookups (`product/single`) filter by the key with `in: [value]` instead of `eq: value`. Both operators produce the same Elasticsearch `terms` filter, so results do not change, but a lookup by ID or SKU now has the same request identity as an equivalent `findProducts` search. On the Forevers page this lets the PayPal and Affirm blocks (`product/single`, key `id`) share the request of the `ProductStructuredData` block (`findProducts`, `id in [...]`) on client-side navigation.
- The PayPal Pay Later and Affirm Storyblok blocks load their product only in the browser after mounting, and first reuse the product from the product dictionary when it is already there. They no longer send a request during SSR, where their result was never rendered, or after a full page load whose SSR state already holds the product.
- The field projection is part of request identity. A full-data request never waits on a list-projection request, so coalescing can never limit a caller to less detail than it asked for.
- Catalog loads (`findProducts`, `single`, and the bundle option prefetch) deep-merge the loaded product into the existing dictionary entry instead of replacing it. Fields, nested fields, and array items the load lacks are kept, and fields it contains are updated, so a list projection or a load without bundle prefetch never removes data. Direct writes outside catalog loads still replace the entry, so intentional removals (filtered Production Time options) are kept.
- Bundle option and grouped product prefetches request as many products as they have linked SKUs. Before, they used the default page size of 50, so any linked product after the 50th was never attached. Custom Pajamas already links exactly 50 SKUs.

## Capabilities

### New Capabilities
- `catalog-search-request-deduplication`: coalescing of concurrent identical catalog search requests, isolation of each caller's result, and field projection as part of request identity.
- `catalog-product-data-merge`: merging of product writes into the product-by-SKU dictionary without losing detail.

### Modified Capabilities
<!-- None -->

## Impact

- Code:
  - `core/lib/search.ts` (`quickSearchByQuery`);
  - `core/data-resolver/ProductService.ts` (`getProduct` filter operator);
  - `core/modules/catalog/helpers/associatedProducts/setBundleProducts.ts` and `setGroupedProduct.ts` (prefetch size);
  - `src/modules/payment-affirm/components/storyblok/AffirmMonthlyPayment.vue` and the theme `components/storyblok/PayPalPayLaterMessage.vue` (product loading);
  - `core/modules/catalog/store/product/` (`actions.ts` `findProducts` and `single`, a new `PRODUCT_MERGE_PRODUCT_BY_SKU` mutation in `mutations.ts` and `mutation-types.ts`);
  - unit tests for these.
- The existing `PRODUCT_SET_PRODUCT_BY_SKU` mutation keeps replacing the entry, and theme code that commits it (`use-multi-products-page.ts`) keeps working unchanged. The `afterSetBundleProducts` hook in `core/modules/catalog/index.ts`, which stores prefetched bundle option products, switches to the merge mutation.
- Other existing call sites need no changes. That includes `useTextDirectives`, the Storyblok `Product`/`ProductStructuredData` blocks, and the Category page.
- SSR: concurrent renders in the same process may share an identical in-flight request. That is safe because SSR is stateless and each caller gets its own copy.
- Out of scope:
  - Requests that differ in shape but target the same product (a SKU filter vs an ID filter, or extra filters such as `status`) are not merged into one request. Only the `eq`/`in` operator difference for the same key is aligned.
  - A single-product lookup still persists a new query cache entry; previously persisted `eq` entries miss once and are refilled.
  - Consumers that check `if (!dictionary[sku])` before loading still treat a list-projection entry as loaded. That is existing behavior, and the affected consumers only read fields the projection keeps.
  - Non-catalog requests are not deduplicated.
