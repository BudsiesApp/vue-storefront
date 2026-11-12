# Proposal

## Why

SSR currently resolves the real application even when a redirect is already known, so Vue still renders the discarded component tree and runs its backend-fetching `serverPrefetch` hooks. URL-rewrite and Storyblok lowercase redirects are also recorded only after the 404 page has made them uncacheable, while mismatched rewrite tags prevent precise invalidation.

## What Changes

- Record URL-rewrite and Storyblok lowercase redirects during initial navigation through an explicit request-service redirect callback supplied by the theme's application-scoped URL module extension.
- Resolve a trivial, truthy Vue root instead of the storefront app when navigation, page `asyncData`, or `AsyncDataLoader.flush` has recorded a redirect before component rendering.
- Preserve redirect codes, query forwarding, existing `no-cache` tags and cookie-dependent cache exclusions, output hooks, and Express redirect delivery. Skip template processing for recorded redirects while retaining both output hooks. Responses contain no rendered storefront HTML; cached redirect bodies remain `''`, not Express's short redirect message.
- Emit the bare `url_rewrite` tag and a lowercased, query-free, slash-trimmed request-path tag for every rewrite lookup, including misses and the existing Category lookup.
- Keep browser fallback behavior unchanged, and add regression coverage using the real Vue server renderer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ssr-output-cache-isolation`: Skip page data and component rendering for navigation-time redirects, skip component rendering for later pre-render redirects, retain output-hook behavior, and make rewrite-dependent entries precisely invalidatable.
- `storefront-request-services`: Supply navigation fallbacks with explicit redirect callbacks bound to each application rather than deferred renderer contexts.

## Impact

- Main repository `vue-storefront`: `core/server-entry.ts`, the URL-rewrite and Storyblok mapping fallbacks, and their unit tests/SSR fixtures. `core/scripts/utils/ssr-response.ts` must bypass `processOutput` for recorded redirects because the unrendered real root lacks the metadata required by the theme template; both output hooks remain active.
- Theme submodule `src/themes/petsies-capybara` (repository `vsf-capybara`): `config/modules.ts` and focused registration/integration tests. Its companion changes must be tested with the main repository; payment and Varnish submodules are unaffected.
- No API contract, dependency, redirect-policy, or TTL changes. Magento and `vue-storefront-api` require no implementation changes in this task.
- Accepted limitation: after a Magento rewrite deletion or request-path rename, a cached redirect can remain stale until the existing output-cache TTL expires (default 86400 seconds, deployment override `SSR_OUTPUT_CACHE_TTL`). Release/PR text must describe this limit and any observed mixed-case/trailing-slash invalidation mismatch in its own words and state that a Magento-side fix is needed; no storefront workaround is introduced.
- Category rewrite detection stays in `serverPrefetch`, and the aliased-out legacy `src/modules/client.ts` remains untouched.
