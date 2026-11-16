# Design

## Context

See proposal.md for motivation and the delta specs for the behavior contract. The controlling input is tasks/i-37184-prevent-cross-visitors-cache-leakage/task.md sections 4–7, amended by operator decision D-1 under "Decisions made during spec review"; section 8 is manual-verification context only.

Observed in this checkout:

- `generatePageCacheKey()` already removes ignored query keys, but `core/server-entry.ts` navigates using `context.url`; `server.ts` caches the resulting body, headers, status and redirect.
- `vuex-router-sync` freezes a route snapshot including `from`. URL dispatcher parameterization also copies query values into temporary route params. Cleaning only `query` or only final JSON misses other output.
- `createRequestServices()` has the single server cookie-read boundary. `createBundleRenderer()` uses its default isolated context, so bundle module globals cannot communicate dependencies to the server process.
- Server extensions are loaded before requests. `TagCache.set()` associates keys with tag sets; invalidation deletes their data entries. Neither a new server hook nor a Redis implementation change is necessary.
- Internal cookie dependency recording leaves the existing request-service boundary intact. The Holiday-presentation delta updates only its country fallback to match D-1.

## Goals / Non-Goals

**Goals:** Implement R1–R8 through shared core/server boundaries and the owning country's module, with independently testable cache policy and response handling. Every new runtime element below addresses an identified gap in the existing path.

**Non-Goals:** No new configuration flags, cookie readers, delivery rules or general render cancellation after a redirect recorded late in rendering. Redirect callers are migrated (D3a) because the single-navigation design depends on every redirect passing through the server; skipping the remaining page render after such a redirect stays with the follow-up URL-rewrite task.

## Decisions

### D1. Split the request once; render and resolve redirects from the clean URL (R1–R3, R5, R7)

`core/scripts/utils/page-cache-key.ts` owns the query policy. `splitPageCacheUrl(url: URL)` returns `{ cleanUrl, strippedQuery }`: `cleanUrl` is the pathname plus the query after deleting every ignored key (the existing key serialization), and `strippedQuery` keeps the request's ignored pairs in their original encoding, detected per pair by decoded name (so `%65mail` and blank or repeated values count). `buildPageCacheKey(site, cleanUrl)` formats `page:<site>:<cleanUrl>`; `generatePageCacheKey()` delegates and keeps its exact output.

`server.ts` splits the request exactly once, through `outputCache.createRequest()`, and passes `cacheRequest.cleanUrl` to `initSSRRequestContext(app, req, res, config, renderUrl)`, which sets `context.url = decodeURI(renderUrl)` (default `req.url`, so static generation is unchanged). The renderer no longer derives URLs or cache data itself; no placeholder site or origin is needed.

`core/server-entry.ts` keeps one navigation: `router.push(context.url)` with the clean URL. In `onReady` it returns early if the response was already sent (defensive), sets `context.output.redirect` from a router redirect (301, `fullPath`) and returns, or returns when navigation has already recorded a redirect (D3a). Otherwise it loads page data as before. The sign-in `no-cache` exception is deleted.

Because the router only sees the clean query, a redirect's Location carries the route's significant query but none of the visitor's stripped values. The server appends them when sending (D5). This replaces the earlier two-navigation design (full URL for redirect detection, then `router.replace()` to the clean URL), which ran navigation guards and mapping fallbacks twice, duplicated fallback API calls and queued fallback redirects, and needed per-request cache bypasses for redirects.

Trade-off accepted by the operator: routes whose redirect builds an explicit query (six legacy aliases, e.g. `pillowSideDesign-product-redirect`) now also forward the visitor's stripped parameters such as `utm_*` and `coupon_code`; previously they dropped them. Forwarding keeps attribution and promo codes on those legacy links. Generic ignored names (`id`, `qty`) are forwarded too; no destination is known to receive them from these aliases.

### D2. Serialized route state follows the clean navigation (R1, R3)

With a single navigation from the start route, vuex-router-sync's `route` (including `from`) and `url.currentRoute`/`url.prevRoute` are populated only from the clean route, and dispatcher parameterization receives only the clean query. No route-state reset or string substitution is needed. `context.initialState` is captured before navigation. A real router/Vuex/SSR fixture, including dynamic mapping, scans the entire generated HTML.

The client still boots from `window.location` and synchronizes the actual query, so browser query consumers (coupon activation, artwork prefill, attribution) keep working after hydration.

### D3a. Application redirects are recorded, never sent by application code (R1, R6)

`core/request-services` exports `setServerRedirect(context, path, statusCode = 302)`, which records `{ code: 301 | 302, path }` in `context.output.redirect`. The server-side `requestServices.redirect()` delegates to it instead of calling `response.redirect()`. Callers migrated: URL-rewrite fallback (`redirect` callback, `ssrContext` and AsyncDataLoader branches), Storyblok lower-case redirect, `Category.vue` (already uses request services), `core/pages/Checkout.js` (which now also returns early without a context), `core/modules/catalog/events.ts` parent redirect and the theme's missing-product redirect in `pages/Product.vue`, which additionally tags `no-cache` so a missing product is not cached as a redirect. Recorded redirects are sent by `server.ts` under D5's Location, caching and tagging rules. Redirects recorded during AsyncDataLoader flush still let the page render once; its output is discarded.

### D3. Render context transports cookie-read names, never a shared bundle registry (R1, R4, R6)

Add `Context.output.cookieReads: Set<string>`, initialized per request in `initSSRRequestContext()` and removed by `clearContext()`. In server-side `createRequestServices().getCookie(name)`, add the name before extracting its value, even when the cookie is absent; browser reads remain unchanged. Server-side tracking stays private to the closure and does not extend `RequestServices` or expose cache tags to consumers.

After rendering, the process reads `Array.from(context.output.cookieReads)`; no cross-realm `instanceof Set` check or bundle-global state is used. The existing render context is the only transport required across the renderer boundary. Classifying all request cookies instead was rejected because unused cookies do not affect output and would unnecessarily disable safe sharing.

### D4. Register domain variation in the existing server-extension lifecycle (R4, R6, R7)

Create `core/scripts/utils/output-cache-variations.ts` with `registerOutputCacheVariation(cookieName, { tag, resolve })` and `resolveOutputCacheDependencies(cookieReads, requestInputs)`. The process-local map is populated once as extensions are required; it is not imported by bundle-side cookie tracking. Resolvers receive only the cookie value and return a bucket string. Dependency classification excludes only the configured A/B cookie (already in the key), collects registered variations, and adds `no-cache` for any other read. Log unknown dependency names once per request, without values. This small registry is necessary because core cannot hardcode a module's cookie or delivery policy.

Add `src/modules/customization-system/server.ts`; its top-level registration imports the existing `DETECTED_COUNTRY_COOKIE_KEY`, the domain helper below and the core registration function. It registers `detected_country` with tag `detected_country`. The existing server-extension glob supplies registration before the first cache lookup, including lookups which never render. No new hook, application module, global Vue property or core import of `src/modules/*` is introduced. Registering from the bundle's application module would be too late and in the wrong realm.

Add the pure `src/modules/customization-system/helpers/resolve-delivery-country-bucket.ts`, exporting `DeliveryCountryBucket = 'US' | 'INTL'`, `DEFAULT_DELIVERY_COUNTRY = 'US'` and `resolveDeliveryCountryBucket(country)`: trim and uppercase the input, substitute the constant for a missing/blank value, return US for US and INTL otherwise. Both the server resolver and `use-holiday-delivery-location.ts` import it; the composable uses persisted shipping country > detected cookie > this default, retains manual override, maps the bucket to `HolidayDeliveryLocation`, and removes its `storeView.i18n.defaultCountry` read. This implements D-1 with one domain rule and requires no store-view resolution or store-selection changes.

### D5. Focused cache modules own entries, keys, lookup and write policy (R1, R2, R4–R7)

Create `core/scripts/utils/output-cache.ts` exposing `createOutputCache({ cache, variations, config, logger })` with `createRequest()`, `read()` and `write()`. It consumes a narrow asynchronous `{ get, set, invalidate }` cache interface, allowing the existing TagCache and an in-memory Jest double. Keep entry/input types in `output-cache-types.ts`, variation policy in D4's module, and Express orchestration in `server.ts`; aim for focused files under 300 lines. Leaving policy in the 440-line server would make cross-request regressions require a live Express/Redis stack.

Let `B = generatePageCacheKey(site, originalAbsoluteUrl) + (nonemptyAbGroup ? ':' + abGroup : '')`, with `site = req.get('x-vs-store-code') || 'main'` and the existing configured A/B cookie extraction. The A/B value is URI-encoded in the key: it is visitor-controlled, and an unencoded value such as `detected_country:US` would otherwise equal another entry's variant key. A variation suffix is constructed from sorted cookie names and encoded resolver buckets: `B:detected_country:US` or `B:detected_country:INTL` for the one registration in this change. Never include raw country/cookie values. Sorting is deterministic composition of registered dependencies, not a new product capability.

Entry shapes are a discriminated union. All are stored through existing `cache.set(key, entry, tags)` with the existing TTL:

| Entry | Key | Stored data | Tags |
| --- | --- | --- | --- |
| Normal | B | `{ kind: 'response', headers, body, httpCode, redirect: null }` | Page tags |
| Redirect | B, or variation key if country was read | `{ kind: 'response', headers, body: '', httpCode, redirect: { code, path } }` | Page tags + `redirect` + variation tags if applicable |
| Marker | B | `{ kind: 'variation', cookies: ['detected_country'] }` | Page tags + `detected_country` (+ `redirect` when marking a redirect) |
| Country variant | B + country suffix | Same response shape as normal/redirect | Page tags + `detected_country` (+ `redirect` for redirects) |

Markers contain neither body nor HTTP headers and are never served as responses. The `kind` discriminator distinguishes markers from response entries.

**Read rules, in order:**

1. If caching is disabled, render without cache operations. Otherwise fetch B; an absent entry is a miss.
2. A normal response entry is eligible immediately, subject to the redirect rule below. For a marker, compute current buckets from the current request cookie values using the process-start registrations, then fetch its variant. An absent variant is a miss; never fall back to another bucket or serve the marker.
3. For an eligible hit, restore cached headers/status and send its body, or its redirect with `appendStrippedQuery(path, cacheRequest.strippedQuery)`, with `X-VS-Cache: Hit`. Fresh rendering uses `X-VS-Cache: Miss`. Tracking parameters alone do not disqualify normal HTML.

**Write rules, in order:**

1. `headersSent` prohibits every write. Disabled caching and a `no-cache` tag prohibit normal, redirect, marker and variant writes alike. Dependency classification in D4 applies even when output-cache tag headers are disabled.
2. A redirect is stored with the Location resolved from the clean URL, regardless of the request's stripped parameters, and sent with them appended. The stored Location is not scrubbed: keys such as the auth guard's `redirect-target` are derived from the clean route, and appending never overrides an existing key.
3. With no variation read, store a normal response at B. With registered reads, derive the variant using the same resolvers as lookup, store the variant first, then the marker. Refresh marker tags on each successful variant write. A missing marker causes a safe fresh render; a marker whose variant expired causes a miss. No new Redis transaction is required.
4. Classify the complete cookie-read set before writing. The render handler classifies reads made during rendering before setting `X-VS-Cache-Tags` and calling output hooks, then re-classifies if output hooks or template processing read further cookies, refreshing the tag header and passing the final dependencies to `write()`. Unknown names already reported are not warned twice.
5. Tags in the entry table follow the existing `useOutputCacheTagging` flag: when enabled, add `redirect` and variation tags to page tags before generating `X-VS-Cache-Tags` and invoking output hooks, and pass those tags to `cache.set`; when disabled, pass an empty tag array. Always honor the render's `no-cache` independently of that flag. With tagging enabled, each marker and variant receives the current page tags, and TagCache's tag sets retain associations from previous writes.

Add `redirect` and `detected_country` to `server.availableCacheTags` in `config/local.json.template`; deployments generate `config/local.json` from it, and node-config replaces the default array with that list. They allow both explicit and wildcard invalidation through the existing endpoint; page-tag invalidation also removes marker and all its variants. Do not add a configuration flag or modify the local-only config as part of this change. Update only AGENTS.md's `ignoredQueryKeys` source reference to `core/scripts/utils/page-cache-key.ts` during implementation.

### D6. Response ownership and promise containment at each server boundary (R1, R6)

Extract the render-completion/error callbacks into `core/scripts/utils/ssr-response.ts` as `createRenderResponseHandler()` and `createSsrErrorHandler()`, supplied narrow response, logger, hooks, output processing and output-cache dependencies. Wire those exact factories from `server.ts` so Jest tests exercise production callbacks without starting a listener. Preserve existing output-hook and response behavior while removing cache policy from the server. The existing pre-cache trailing-slash redirect remains unchanged.

- First statement of the render-success callback checks `res.headersSent`: warn with URL and `response already sent by application code`, then return before content-type/cache-tag headers, hooks, processing, writes or `end`. This prevents storing a direct application's Location/status and prevents `ERR_HTTP_HEADERS_SENT`, with or without page tags.
- The error callback first checks `headersSent`, logs and returns; only unsent responses take the existing `/page-not-found` or `/error` branches. This prevents a second redirect when render/cache errors follow a sent response.
- Keep cache writes off the response's critical path: invoke `write()` without awaiting completion, attach a logging `.catch` that never calls `errorHandler`, and send the response immediately. For variants, the detached write promise sequences variant then marker and captures immutable entry/tag/key inputs before render-context cleanup; this preserves miss latency and prevents a late write failure from attempting a second send.
- Return/await lookup and render promises, capture synchronous renderer throws in a promise continuation, and use `.then(renderHandler).catch(errorHandler).finally(() => clearContext(context)).catch(logFinalFailure)` for the render chain plus a final logging catch after lookup/error handling. The last logging catch returns normally and performs no response work, covering an error-handler or cleanup throw. There is no global `unhandledRejection` listener.

### D7. One scenario per test family with synthetic cross-request fixtures (R1–R8)

Use the repository Jest configuration and an in-memory tag cache with TTL behavior and tag membership matching TagCache; no Redis/Docker connection. Use real Vue Router query redirect policies and vuex-router-sync in focused server-entry fixtures, actual SSR HTML/state serialization, and injected render/response dependencies for cache/ownership cases. Client query compatibility is verified manually because its code is unchanged. All email, artwork, coupon, route and store values are synthetic.

Each test family in tasks.md names exactly one delta-spec scenario. Parameterize both request orders and cold/repeat access inside that family. Where policy forbids a hit (parameterized redirects or unknown cookies), assert repeated misses/no writes alongside the query-free hit control rather than manufacturing an unsafe cached response. Core-only tests cover policy/transport; module tests cover the shared bucket/composable. Do not duplicate scenario coverage in multiple suites.

## Risks / Trade-offs

- SSR code that read stripped parameters (e.g. route props from `id`, `qty`, `email`, `order_item_id`) now renders them as absent and receives them after hydration; they were already shared across visitors on cache hits.
- Explicit-query legacy redirects now forward stripped parameters (D1 trade-off).
- Known SSR artwork attribute differs from the browser's real query → preserve browser router restoration and verify query consumers manually; no optional theme change is added.
- Marker and variant expiration or interrupted writes can leave only one entry → treat unavailable marker/variant as a miss; write variant first and never serve a marker. Availability may cost a render, never another country's first paint.
- Redirects recorded during AsyncDataLoader flush still render the page once → the output is discarded; render cancellation remains the follow-up. The `headersSent` guards stay as a defence against any future direct response write.

## Migration Plan

Implement and validate the tasks before deployment. The existing `core/scripts/generate-files.ts` generates a new `core/build/cache-version.json` UUID for a build, and `cache-instance.ts` uses it as the Redis prefix; deploy a fresh build/prefix so old untagged redirects and polluted pages cannot be reused. Do not mix old and new workers sharing one prefix, because old readers cannot interpret marker entries. No data migration or Redis commands are part of this planning step.

Normal tag invalidation works after rollout. Rollback uses a separately built release and fresh prefix rather than reusing incompatible cache data; reverting also restores the original defect. Verify the resulting build with the task.md section 8 manual procedure using synthetic inputs. Local Elasticsearch fixtures, CloudFront changes and historical cache investigation are excluded.
