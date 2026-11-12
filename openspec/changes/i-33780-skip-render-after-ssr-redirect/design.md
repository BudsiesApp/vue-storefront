# Design

## Context

See `proposal.md` for motivation. This design follows task #33780 and binding decisions D1–D9 in `tasks/i-33780-skip-render-after-ssr-redirect/decisions.md`.

The current branch includes the prior SSR work: local history contains #37185, and `core/server-entry.ts` already records router redirects and checks `context.output.redirect` after navigation. However, both those early exits and `_ssrHydrateSubcomponents` resolve the real app. Vue's bundle renderer subsequently renders that app and awaits component `serverPrefetch`, including the settings, currency, rates, and optional promotion fetches in the theme's `App.vue`.

The theme's `config/modules.ts` extends `url/mapFallbackUrl` with Storyblok followed by URL-rewrite mapping, but passes only the normal action payload. Both fallbacks therefore queue server redirects through `AsyncDataLoader`, after `Error.vue.asyncData` has added `no-cache` and a 404 status. Category already passes `requestServices.redirect` explicitly, but only from `serverPrefetch`.

The required boundaries exist: `createApp()` creates `services.request` for its render context, `registerApplicationModule()` initializes per app, and `mappingFallbackForUrlRewrite` already supports a narrow redirect callback. `core/scripts/utils/ssr-response.ts` sends both fresh and cached redirects using `res.redirect`; `output-cache.ts` already stores `''` for redirect bodies. The theme webpack alias replaces `src/modules/client` with `theme/config/modules`, confirming why the legacy file stays untouched (D3).

Affected repositories are the main `vue-storefront` checkout and its `src/themes/petsies-capybara` submodule (`vsf-capybara`). No payment, Varnish, Magento, or API implementation change is needed. Discovery used exact source and local history; CodeGraph is unavailable on this machine.

## Goals / Non-Goals

**Goals:**
- Move redirect recording to the earliest existing navigation boundary without bypassing the URL store, changing lookup order, or changing client routing.
- Prevent the real root and page subtree from entering renderer phase two when phase one already knows the redirect.
- Reuse the existing response/cache owner rather than adding a second response path.
- Align rewrite dependency tags before lookup, so both redirect hits and cacheable lookup misses can be invalidated.

**Non-Goals:**
- Cancel already-started `asyncData` or loader work, abort `createApp`, or move Category's rewrite detection earlier.
- Refactor global store, cache-tag infrastructure, module registration generally, or other redirect producers.
- Add invalidation tags for Storyblok lowercase redirects, change query normalization, change redirect codes/TTL, or force zero-byte HTTP responses.
- Repair Magento delete/rename invalidation or edit the aliased-out legacy `src/modules/client.ts`.

## Decisions

### 1. Bind the navigation callback at application registration

Change the theme's `extendUrlModule` to `registerApplicationModule` and construct its `mapFallbackUrl` action extension inside that module invocation, closing over `services.request.redirect`. Supply the optional callback explicitly to both fallbacks alongside their existing `url` and `params`. Keep the existing `extendStore` pattern and fallback order/route-result handling. Do not retain a callback in a process-global mutable variable or add renderer context to Vuex payloads.

`forStoryblok` gains the same optional `(path: string, statusCode?: number) => void` contract already accepted by URL rewrite. Branch on callback availability, not `isServer`: for a matching rewrite, a supplied callback records the existing target/query and lookup status (301 for `RP`, otherwise 302) immediately and the fallback returns no route data; without a callback, return `getUrlRewriteRouteData` on either server or browser. For a matching lowercase story, call the supplied callback immediately with `url.toLowerCase()` and 301; without one, do not record a redirect. The lowercase branch returns no route data in either case. All active server callers receive a callback through the wiring above or Category's existing explicit boundary. This completes the optional-callback contract without adding a missing-callback guard, deferred fallback, or new error. Browser behavior, editor branches, and ordinary story branches stay unchanged.

The theme keeps the application module in `config/extend-url-module.ts`, imported and registered from `config/modules.ts`, so its request-scoped closure can be tested without loading every unrelated theme module.

Remove the fallbacks' deferred `AsyncDataLoader` branches and the URL-rewrite fallback's unused `ssrContext` parameter/imports after wiring the active callers. The current callers are the theme navigation action, Category's explicit callback, and the aliased-out legacy Storyblok action; leave that legacy file unchanged. Do not remove the loader from other redirect producers.

**Why not retain deferred recording?** It is precisely what lets the 404 page poison the redirect's cache eligibility. **Why not process-wide registration?** Request-service closures must refresh on every `createApp()` call, not point at an earlier render (D1, D3).

### 2. Return a truthy stub when pre-render output will be discarded

Use a small request-local factory in `core/server-entry.ts` that constructs a minimal root with the same imported Vue constructor, for example `new Vue({ render: h => h('div') })`. It must have no real app/page children, router, store, or page-prefetch hooks. Its tiny markup is discarded by the existing redirect response path.

Resolve that stub for the router `redirectedFrom` branch and for an already recorded redirect after `router.onReady`. After `_ssrHydrateSubcomponents` finishes `AsyncDataLoader.flush` and its existing state/config preparation, resolve the stub if `context.output.redirect` is set; otherwise resolve the original app. This single post-loader decision covers missing-product and checkout redirects recorded during `asyncData`, and configurable-child redirects recorded in queued work. Keep existing initialization, metadata bindings, page-data ordering, and ordinary render behavior.

The defensive `headersSent` early return also resolves the stub: application code has already sent the response, so real-app output would be discarded. The response handler still prevents another send and cache write. Category redirects first recorded during phase-two `serverPrefetch` cannot retroactively prevent rendering and are excluded from the stub change.

**Why not resolve `null` or throw a redirect error?** The bundle renderer's truthy-app continuation would leave a null result pending, while throwing would enter the existing error-response path. A valid stub preserves the successful renderer completion contract without rendering the real tree. Merely returning the real app early skips data loading, not component rendering.

### 3. Preserve response ownership, hooks, and cache policy

Do not replace `createRenderResponseHandler`, `appendStrippedQuery`, cache lookup delivery, or `OutputCache.write`. They remain responsible for one redirect, request-specific stripped parameters, the `redirect` tag, and empty cached bodies. D8 means that the HTTP response contains no rendered page HTML, not zero bytes: Express's standard short redirect message stays on both Miss and Hit.

In `createRenderResponseHandler`, unconditionally skip only `processOutput` when `context.output.redirect` is set; retain normal template processing otherwise. This is required, not an implementation choice: `context.meta` belongs to the real root, which has no `metaInfo`; only its rendered layouts initialize vue-meta's root marker. Without that marker, vue-meta 2.3.3 `inject()` returns `{}` (`node_modules/vue-meta/dist/vue-meta.common.js:1806–1810`), so the theme template's `meta.inject().htmlAttrs.text()` throws before redirect delivery and the error handler substitutes `/error`. Bypassing the discarded template stage avoids that real failure without catching unrelated exceptions or inventing metadata. Add a regression using the actual unrendered root's vue-meta `$meta()` and the real compiled theme template or `applyAdvancedOutputProcessing`: demonstrate the template incompatibility and verify that the handler skips it and completes the recorded Location, not `/error`. The current fixture's fake `$meta()` and identity `processOutput` cannot prove this regression.

Never skip `beforeOutput` or `afterOutput`: Fastly's before-output hook sets `Surrogate-Key` (D6). Preserve their existing order and cookie classification behavior. Navigation/data-loading and late before-output cookie reads remain subject to the existing non-A/B-cookie exclusion; normal-page template reads retain their existing classification. Keep every `no-cache` tag already added during navigation or page/queued data loading, including Product's tag before its `/404` redirect (`pages/Product.vue:208–211`). Removing page-prefetch work must not remove exclusions established before rendering or by the retained processing stages.

### 4. Normalize rewrite tags, not redirect targets

In `mappingFallbackForUrlRewrite`, derive the path-tag suffix by removing the query from `url`, stripping leading/trailing slashes as `loadUrlRewrite` does, and lowercasing the result, then emit `url_rewrite` and `url_rewrite_<suffix>` before dispatching the lookup. For example, `/Old-Url/?step=2` emits `url_rewrite_old-url`. Do not rewrite the redirect target or visitor query as part of tag normalization. Reuse the existing cache-tag access at this call site without introducing new prototype access or moving tags into request services.

Do this even when the lookup returns no rewrite (D4): invalidating a newly created rewrite must clear a previously cached page that checked the same path. Because Category uses the same fallback, it automatically gets the tag correction without moving its lookup. Storyblok gets no additional invalidation scheme (D5): `storyblok/checkStoryExist` contributes no cache tags (`src/modules/vsf-storyblok-module/store/actions.ts:85–98`), so the lowercase redirect itself carries only `redirect`, plus any tags contributed by earlier navigation work or other applicable lookups. Do not add a Storyblok dependency tag.

**Why not tag the raw path or wait for a returned Magento row?** Raw paths include the mismatching leading slash, and case-insensitive API lookups must be represented by a tag computable even before a rewrite exists. Magento must ultimately emit the same normalized spelling; storefront code must not select a different rule for mixed-case backend data (D4).

## Verification Design

Implementation tests must distinguish rendering a real page from merely completing `renderToString` for a stub:

- Extend `core/test/unit/server-entry-cache.spec.ts` and the focused `core/scripts/utils/test/unit/fixtures/output-cache.ts` support to use the real `vue-server-renderer` against the entry result, with root/page render and `serverPrefetch` spies. Cover an already-sent response, router redirects/`redirectedFrom`, navigation-time recording, Product `/404`, Checkout cart, and configurable-child loader recording. Assert the already-sent response skips real-app hooks, a second send, and cache writes. Exercise the real producer where practical and retain its existing target/status assertions. Assert request completion, no real root/page hooks, one redirect, no page markup, and an empty cached body when shareable. Assert Product's `/404` retains `no-cache` and is never stored; cover preservation of pre-render `no-cache` tags for every applicable redirect. Include a non-redirect control proving normal hooks still run.
- Keep existing query-isolation tests and add fallback-to-entry integration coverage showing the not-found page's `preAsyncData`/`asyncData` do not run for URL rewrite or Storyblok lowercase. Repeated requests must produce Miss then Hit without a stray 404 or `no-cache` from the error page.
- Unit-test both environment-independent fallback callback/return contracts, including URL rewrite returning route data without a callback and Storyblok lowercase returning no route data or redirect without one, permanent/temporary rewrite codes, query construction, existing Storyblok editor/story/no-story branches, and normalized tag forms with and without a rewrite. Exercise Category's use of the shared tag rule without changing its discovery timing.
- Add focused theme registration coverage proving a fresh action closure is bound to each application's `services.request.redirect` and browser registration receives no callback. Keep this with the theme companion code rather than broadening registration infrastructure.
- Use the existing response harness for empty stored body, normalized path invalidation after a hit, invalidation of a cacheable lookup miss, and refresh to a changed target. Retain existing `redirect`/wildcard invalidation coverage. Test output hooks/header side effects and non-A/B cookie reads before rendering and in before-output processing. Add the real unrendered-root vue-meta/theme-template regression described in Decision 3, proving recorded redirects bypass `processOutput` and preserve their recorded Location while normal responses still process templates.
- Run `yarn test:unit:core` locally and `yarn test:unit:maintained` for maintained module/theme tests; report the core result explicitly because CI excludes `core/`. Run lint/type checking for the changed files using the repository tooling.

The tester, not the implementer task checklist, owns live verification in the dev environment: a real rewritten URL and a Storyblok lowercase URL, 301/302 and Location/query correctness, no page HTML, Miss then Hit, no `App.vue` prefetch backend calls, and authorized invalidation of `url_rewrite_<path>` followed by a fresh resolution. A bounded read-only dev-data check for mixed-case/trailing-slash Magento request paths is also tester evidence; findings do not alter the storefront normalization rule.

## Risks / Trade-offs

- [Magento rewrite deletion or request-path rename does not invalidate the old path] → Accepted under D2/D9: stale redirects may persist for the existing output-cache TTL (default 86400 seconds; deployed setting `SSR_OUTPUT_CACHE_TTL`). No shorter TTL, `no-cache` workaround, or backend fix belongs here. Handoff and release/PR text must describe this limit in their own words and state that a Magento-side fix is needed; do not cite a local background file or edit protected pre-existing work.
- [Magento may emit mixed-case or trailing-slash tags] → D4 fixes storefront normalization regardless. If the bounded dev-data check confirms such stored paths, report the finding in the handoff and release/PR text and state that Magento must emit lowercased, slash-trimmed tags (D9). Do not edit protected pre-existing files, add case-specific storefront tags, or claim that those backend spellings are already fixed.
- [Unrendered-root vue-meta injection lacks template-required fields] → Always bypass redirect `processOutput`, not output hooks, and cover the real vue-meta/theme-template path. Keep ordinary template failures on the existing error path.
- [Skipping rendering changes which cache dependencies run] → Intentionally omit dependencies of discarded components; preserve navigation/data/queued-work `no-cache` tags and retained-output-processing cookie exclusions, including Product `/404`, and add regression coverage. No new cookie exception or cache dimension is introduced.
- [A redirect discovered during Category server-prefetch is too late for the stub] → Accepted under D1/D7; apply only the shared tag fix and retain this limitation.
- [The theme change lives in a separate submodule repository] → Review/test main and companion theme changes together; no unrelated submodule updates are needed.

## Migration Plan

No schema, data, API, or dependency migration is required. Deliver the main and theme companion code as one coordinated release through the existing workflow; this plan does not authorize deployment or Git publication. Existing cache keys, redirect entries, TTL, and query handling remain compatible. Ordinary existing entries can age out under current policy; this change adds no automatic purge or operational workaround. Rollback is a coordinated return to the previous main/theme release; already stored redirect entries retain the same readable format and normal expiry/invalidation rules.
