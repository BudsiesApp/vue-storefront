# Design

## Context

See [proposal.md](proposal.md) for motivation and the delta specs for behavior. The checkout already has in-flight catalog coalescing in `core/lib/search.ts`, successful-result caching and an API search adapter that rejects engine error envelopes, invalid JSON and null search results. Only the browser catch converts those failures into empty/offline results.

Route resolution has three distinct boundaries. Core `getFallbackByUrl` fetches the URL-mapping API's raw hit/null contract and returns null for every failure. Storyblok actions use `TaskQueue.execute`, but currently discard the returned task's code. Url-rewrite similarly treats every non-200 task code as a miss. TaskQueue rejects transport/format failures but resolves valid API error envelopes, so allowing its promise to resolve is not proof of success.

SSR render failures already go through `createSsrErrorHandler` without writing output-cache entries. A route-lookup failure instead reaches the error route through the existing navigation guard; `Error.vue.asyncData` sets HTTP 500 and adds `no-cache` before the in-place error render. Neither path needs a cache implementation change.

## Goals / Non-Goals

**Goals:** Establish rejection at the boundary that currently hides each failure; let the existing router, SSR and theme presentation handle it. Keep successful cache hits and the API's success/miss contracts unchanged.

**Non-Goals:** No generic request abstraction, offline-mode replacement, automatic retry/backoff, global TaskQueue behavior change or new error UI for other catalog consumers. No direct component API calls or renderer-context exposure.

## Decisions

### 1. Remove the browser catalog fallback for every caller

Use the existing search adapter and pending-search map with a small catch-path correction. Reject failed searches in both environments. Do not alter successful cache reads/writes, request identity, independent per-caller result copies or the `finally` cleanup of settled pending searches.

An opt-in strict-error flag would add a second catalog contract and require threading a new option through callers; deleting the fallback is smaller and applies the same invariant everywhere. Other consumers retain their own catches and presentation, including the accepted lack of a browser product-page error message. Update the existing browser coalescing test that currently expects resolved offline objects to expect rejection for every waiter, followed by a fresh successful retry.

### 2. Check success where route data enters the application

- In core `getFallbackByUrl`, preserve the raw fetch success contract. Non-OK HTTP responses throw; JSON and transport failures propagate rather than returning null. Successful JSON null remains a miss. TaskQueue is not substituted here because it expects an envelope, unlike this API's raw hit/null contract.
- In Storyblok `fetchStory` and `checkStoryExist`, inspect the task's API code before consuming `result`; reject non-200 codes. Preserve the API's successful missing-story sentinel and false existence result. Keep `loadStory`'s existing failed-loading-entry cleanup so recovery is not blocked by a failed promise.
- In `loadUrlRewrite`, keep 200 result mapping and 404-to-null; throw on other API codes. Existing transport rejections propagate unchanged.

These are small corrections to existing owning boundaries. Do not add redundant validation of internally produced success shapes, retries or a cross-module error framework. The API companion change is responsible for turning real engine failures into these error envelopes rather than successful misses.

### 3. Reuse the existing error route and cache opt-out

Route failures continue to reach `beforeEachGuard` and its existing `next({name:'error'})`. During SSR, that guard navigation renders the error route in place; `Error.vue.asyncData` sets HTTP 500 and adds `no-cache`, which the output cache already honors. A guard navigation is not a route-config redirect and does not take the server-entry redirect short-circuit.

Rejected SSR category prefetch reaches `createSsrErrorHandler`, which redirects to `/error` without invoking the output-cache writer. Once the theme stops swallowing the rejection, this existing path prevents a failed category from being cached. Reuse it without changes or new SSR cache tests; keep server-entry, cache implementation and successful redirects unchanged. No new error page, status scheme or original-URL restoration is needed.

For a successful category miss with no url-rewrite, the theme companion selects the dedicated terminal `category-not-found` route during initial navigation, before products load or the SSR page is chosen. It renders the existing `Error.vue` page-not-found presentation; asyncData recognizes `category-not-found`, returns HTTP 404 and adds `no-cache`, which the output-cache writer already honors. Unlike the wildcard `page-not-found` route, this explicitly matched route does not meet the global URL guard's fallback-mapping condition. The confirmed miss therefore triggers no further Storyblok or url-rewrite lookup that could turn it into a backend error. Keep this real original-request 404 separate from throwing a 404 after rendering starts, which the current SSR error handler translates into a redirect. No change to core SSR, status handling or caching is needed. Focused theme tests verify the terminal route, absence of additional mapping requests, missing-category response and existing cache opt-out; the unchanged backend-failure render path still needs no new dedicated cache harness test.

### 4. Keep changes in their owning OpenSpec roots

This change owns search/lookup propagation and the SSR no-cache contract while reusing the existing cache implementation. `BudsiesApp/vue-storefront-api` owns filter normalization, API lookup status handling and stock removal. The `src/themes/petsies-capybara` companion owns category guard completion, real uncached 404 routing/tests for missing categories, and subsequent-load notifications including sort-triggered page reloads. Each uses the same change name.

## Risks / Trade-offs

- Existing in-memory query hits can be stale → Accepted existing behavior; successful hits do not perform a failing backend request and cache expiry is unchanged.
- Other catalog consumers may log an error while retaining an empty visual block → Accepted scope; no new messages are introduced outside category and route resolution.
- Rejected SSR renders and browser error navigation replace the requested URL with `/error/` → Accepted existing behavior; reloading that URL does not retry the original page. SSR lookup failures can render the error route in place instead.
- Existing bad category cache entries from before rollout can survive until expiry → Runtime failure checks begin from a cold category entry; normal expiry/invalidation remains available. No migration or broad cache purge is introduced.
- A missing category can be created later → Its 404 is not stored in SSR output, so a fresh direct request can render the newly indexed category. Existing query-cache freshness within an already-open browser tab remains unchanged; no new persistent missing-category state is added.

## Migration Plan

No data or dependency migration. Ship with the API and theme companions so all propagation layers agree. Rollback is a normal source-release rollback; no persistent format is introduced. Deployment execution is outside this change.
