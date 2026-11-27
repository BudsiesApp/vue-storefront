# Tasks

## 1. Catalog failure contract

- [x] 1.1 Remove the browser empty/offline fallback in `core/lib/search.ts` so failed adapter searches/result processing reject for every caller; verify focused tests cover browser and SSR failure, successful empty results and unchanged successful-cache reuse.
- [x] 1.2 Update `core/lib/test/unit/search.spec.ts` to expect rejection for every waiter on a failed shared request and a fresh successful retry; verify existing coalescing, field-projection separation and per-caller result isolation tests still pass.

## 2. Route lookup boundaries

- [x] 2.1 Make `getFallbackByUrl` reject non-OK HTTP responses and transport/JSON failures instead of returning null; verify focused action tests distinguish raw hit success, successful null misses and failed requests.
- [x] 2.2 Check TaskQueue API codes in Storyblok story/existence actions before consuming results, retaining the existing failed-story cleanup; verify focused tests cover 500 envelopes, transport rejection, successful missing/found results and recovery after failure.
- [x] 2.3 Keep url-rewrite 200 mapping and 404 misses, but reject other API codes; verify focused action tests cover 200, 404, 400/500, transport failure and successful rewrite reuse without caching failed lookups.

## 3. SSR failure cache isolation

- [x] 3.1 Reuse the existing SSR render-error path without implementation changes or new SSR cache tests; verify by inspection that rejected category prefetch reaches `createSsrErrorHandler`, which redirects without invoking the output-cache writer.

## 4. Maintained checks

- [x] 4.1 Run focused changed suites, `yarn test:unit:core`, `yarn test:unit:maintained`, `yarn lint` and the storefront build under Node 24 with the companion theme present; verify the changed behavior passes its focused regressions and the maintained checks introduce no regressions.
