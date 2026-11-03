# Proposal

## Why

SSR output is cached under URLs that exclude visitor query values, while redirects, markup and serialized state still contain those values. Country-dependent Holiday content also shares one entry across visitors, and direct application redirects can cause double-send errors and unhandled rejections on Node 24.

## What Changes

- Split each request once into the clean URL used by the cache key and the request's stripped query pairs; render and resolve every redirect from the clean URL in a single navigation.
- Send every redirect with the current request's stripped query appended, on cache misses and hits; cache redirects without visitor values so they are shared, tag them for invalidation, and remove the sign-in exception. Legacy routes with an explicit redirect query now forward stripped parameters too.
- Record application redirects (URL rewrite, Storyblok, category, checkout, catalog parent, missing product) through request services in the render context instead of writing the HTTP response, so all redirects follow one server path.
- Track SSR cookie reads through render context. Store country-dependent output in US/INTL variants with a base marker; bypass writes for unregistered, non-key cookie dependencies.
- Use the operator's fixed US fallback for missing or blank detected country in the shared helper and Holiday composable, preserving persisted-country and manual precedence.
- Preserve country-correct first paint, store and A/B separation, safe tracking-query cache hits, and client coupon, artwork and attribution behavior across brands.
- Extract focused output-cache modules, guard already-sent responses, contain promise failures, add synthetic cross-request tests, and correct AGENTS.md's cache-key source reference during implementation.

## Capabilities

### New Capabilities

- `ssr-output-cache-isolation`: Shared SSR output, redirect policy, dependency-driven country variants, invalidation and response ownership.

### Modified Capabilities

- `production-time-option-presentation`: Replace the configured-country fallback with US for Holiday delivery location, per operator decision D-1.

Existing `storefront-request-services` boundaries remain intact; cookie tracking is internal and no cache-tag API is added to request services.

## Impact

Core server entry, request services, SSR context and server output-cache utilities; URL-rewrite and Storyblok mapping fallbacks, `core/pages/Checkout.js`, catalog parent redirects and the theme's `pages/Product.vue` (theme repository); customization-system country helper/composable and server extension; `availableCacheTags` in `config/local.json.template`; Jest regression suites; one AGENTS.md reference correction. No new dependencies, public configuration flags or theme-specific fixes.

Implementation covers task.md requirements R1–R8 and scope items 1–5, plus the redirect-caller migration originally planned for the URL-rewrite task, because the single-navigation design requires every redirect to pass through the server. Skipping the page render after a redirect recorded late in rendering stays with that follow-up task; CloudFront configuration, incident response, delivery rules and local Elasticsearch test data are excluded.
