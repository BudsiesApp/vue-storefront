# Proposal

## Why

Backend failures currently look like empty categories or missing routes, and a failed category render can be cached for later visitors. The OpenSearch 3 review exposed these pre-existing storefront failures alongside API source-filter defects.

## What Changes

- Reject failed catalog searches in the browser as in SSR, for every caller, instead of returning the offline empty-result fallback. Preserve the successful-query cache and in-flight coalescing.
- Distinguish missing routes from failed URL mapping, Storyblok and url-rewrite lookups; propagate failures to the existing error page.
- Ensure failed initial category loads never become successful empty output-cache entries.
- Show the existing page-not-found page for a successful category-plus-rewrite miss on `/c/<slug>/`, with a real uncached HTTP 404 on the direct request and the same missing-page presentation during in-app navigation. Keep existing empty categories successful.
- Coordinate with the same-named API change for source filtering and route lookup responses, and the same-named theme change for category navigation and load-more feedback.

## Capabilities

### New Capabilities

- `route-lookup-failure-propagation`: Failed lookup requests reject; only successful misses continue route fallbacks or reach page-not-found.

### Modified Capabilities

- `catalog-search-request-deduplication`: Catalog failures reject consistently for all browser and SSR callers, including every caller sharing a pending request; successful caching remains unchanged.
- `ssr-output-cache-isolation`: Failed category loads reach existing uncached error paths, and genuine missing categories retain the page-not-found cache opt-out, allowing recovery at the same URL without changing cache implementation.

## Impact

- `core/lib/search.ts` and its existing unit suite; `core/modules/url/store/actions.ts`; Storyblok and url-rewrite Vuex actions and focused regressions.
- Existing SSR error handling, router error handling, `/error/` and page-not-found presentation/cache opt-outs are reused, not redesigned. The theme companion owns the new missing-category routing and its focused tests.
- Companion repositories: `BudsiesApp/vue-storefront-api` and the `src/themes/petsies-capybara` submodule, each with `i-37272-fix-opensearch3-review-issues` in its own OpenSpec root.
- No engine/client upgrade, query-cache expiry, other catalog consumer UI redesign, theme porting or deployment.
