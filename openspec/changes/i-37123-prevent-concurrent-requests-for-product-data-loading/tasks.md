# Tasks

## 1. In-flight request coalescing

- [x] 1.1 In `core/lib/search.ts`, add a module-level in-flight map (`Map<string, Promise<SearchResponse>>`) keyed by the existing `cacheKey`. In `quickSearchByQuery()`, wrap the existing `searchAdapter.search()` → `resultProcessor` → `cache.setItem` block in one shared promise stored under that key, delete the entry in `finally`, and give every caller `cloneDeep(result)`. Keep the cache read path, the `cacheKey` composition (including `_sourceInclude`/`_sourceExclude`), and the existing `catch` branches unchanged. Verify with the tests in 3.1.

- [x] 1.2 In `core/data-resolver/ProductService.ts` `getProduct()`, filter with `{ 'in': [options[key]] }` instead of `{ 'eq': options[key] }` (design Decision 6). Verify with the test in 3.4 and the check in 4.1.
- [x] 1.3 In `src/modules/payment-affirm/components/storyblok/AffirmMonthlyPayment.vue` and the theme `components/storyblok/PayPalPayLaterMessage.vue`, load the product in `mounted` instead of `created`, and take it from `product/getProductByIdDictionary` before dispatching `product/single` (design Decision 7). Verify with the check in 4.1.

## 2. Dictionary merge

- [x] 2.1 Add the `PRODUCT_MERGE_PRODUCT_BY_SKU` mutation type and mutation: when the SKU has an entry, store `merge({}, existing, product)` (`lodash-es/merge`), otherwise store the product. Keep `PRODUCT_SET_PRODUCT_BY_SKU` as a plain replacement (design Decisions 4 and 5). Verify with the tests in 3.2.
- [x] 2.2 In `core/modules/catalog/store/product/actions.ts`, commit `PRODUCT_MERGE_PRODUCT_BY_SKU` from `findProducts` and `single`, and in the `afterSetBundleProducts` hook in `core/modules/catalog/index.ts` (design Decision 5). Verify with the test in 3.3 and the check in 4.2.
- [x] 2.3 In `core/modules/catalog/helpers/associatedProducts/setBundleProducts.ts` and `setGroupedProduct.ts`, pass `size: skus.length` to `ProductService.getProducts()` (design Decision 8).

## 3. Tests

- [x] 3.1 Add `core/lib/test/unit/search.spec.ts`, mocking `getSearchAdapter`, `StorageManager` (cache miss), `rootStore`, and `config`. Cover:
  - (a) two concurrent identical calls → adapter `search` called once, and both get equal but separate (`!==`) results;
  - (b) two concurrent calls that differ only in `excludeFields` → two adapter calls;
  - (c) after a failed shared call, the next identical call sends a new request.

  Verify with `yarn test:unit:core --testPathPattern=core/lib/test/unit/search.spec.ts`.
- [x] 3.2 Add `core/modules/catalog/test/unit/store/product/mutations/productBySku.spec.ts`. Cover:
  - `PRODUCT_SET_PRODUCT_BY_SKU` replaces the entry;
  - `PRODUCT_MERGE_PRODUCT_BY_SKU` stores a product without an existing entry as is;
  - `PRODUCT_MERGE_PRODUCT_BY_SKU` over an existing entry keeps fields the product lacks (`customizations`, nested `stock.max_sale_qty`, bundle link `product`), takes the product's values, stores a new object, and leaves the previous entry unchanged.

  Verify with `yarn test:unit:core --testPathPattern=store/product/mutations`.
- [x] 3.3 In `core/modules/catalog/test/unit/store/product/actions/findProducts.spec.ts`, verify that loaded products are committed with `PRODUCT_MERGE_PRODUCT_BY_SKU`. Verify with `yarn test:unit:core --testPathPattern=findProducts`.

- [x] 3.4 Add `core/data-resolver/test/unit/ProductService.spec.ts`, mocking `quickSearchByQuery`, `StorageManager` (cache miss), and `configureProducts`. Verify that `getProductByKey({ options: { id: '73' }, key: 'id', skipCache: true })` searches with the applied filter `{ attribute: 'id', value: { in: ['73'] } }`, `size: 1`, and `start: 0`, and that the same holds for key `sku`. Verify with `yarn test:unit:core --testPathPattern=ProductService`.

## 4. Verification

- [x] 4.1 Locally, open `/forevers-pet-plush/` through client-side navigation and verify in the network panel that only one catalog request per distinct query is sent for `ForeversDog_bundle`, instead of five. Do a full page load and verify that the SSR or API log shows a single matching request. On the same client-side navigation, verify that product `73` is requested once with `id in ["73"]` and that no `id eq "73"` request is sent (PayPal Pay Later, Affirm, and product structured data blocks). On a full page load, verify that the browser sends no request for product `73` and that the SSR or API log shows no request from the PayPal or Affirm blocks, while both messages still show the product price.
- [x] 4.2 Locally, open a bundle or customizable product page, navigate to a Category page that lists it, and navigate back. Verify that customization options, bundle option products, and the cart max quantity are intact, and that `productBySku[sku]` still has `customizations` and `media_gallery` (Vue devtools). No active Category page lists a bundle product, so bundles were checked through their creation pages: the Forevers Dog creation page via `/pricing/` and the Gift Add-ons Category and back (cart max quantity stays 1000 from the default `simpleForeversDog_small` link), and the photo pillow creation page via the photo pillow designs Category and back. The configurable Custom Bling Collar was checked via the Gift Add-ons Category and its product page.
