# Spec Delta

## MODIFIED Requirements

### Requirement: Redirects forward the current request's stripped parameters

Every SSR redirect, whether produced by a router redirect or recorded by application code, SHALL be resolved during SSR processing of the clean URL represented by the cache key. When the server sends a redirect, after fresh SSR processing or from a cache hit, it SHALL append the current request's stripped query pairs to the Location in their original encoding, after the Location's own query and before any fragment, without overriding a key the Location already contains. A cached redirect SHALL store the Location resolved from the clean URL, SHALL contain no stripped visitor values and SHALL be shared by requests that differ only in stripped parameters. Error redirects and the pre-render trailing-slash redirect SHALL keep their existing behavior. No route-specific sign-in exception SHALL be required.

#### Scenario: Each visitor receives their own stripped values on redirects
- **WHEN** two visitors with different stripped values request a redirect, in both orders, for each of forwarding, inherited and explicit query policies, with cold and prewarmed cache states
- **THEN** each Location contains the route's query resolved from the clean URL followed only by that request's stripped values, with the existing redirect status
- **AND** one cached entry serves every request and contains neither visitor's values

#### Scenario: Query-free and parameterized requests share one redirect entry
- **WHEN** a query-free request and a parameterized request follow the same redirect in each order and are repeated
- **THEN** the query-free request receives the cached Location unchanged and the parameterized request receives it with its own stripped values appended
- **AND** the redirect is resolved once

#### Scenario: Query-free redirects remain cacheable
- **WHEN** a redirect receives repeated requests without stripped parameters
- **THEN** the first request populates the cache and the next request uses the cached status and Location

#### Scenario: Router redirects resolve once from the clean URL
- **WHEN** a route whose redirect omits an explicit query receives a URL containing significant and stripped query parameters
- **THEN** a single navigation of the clean URL detects the redirect without loading page data or rendering the storefront component tree
- **AND** the Location contains the inherited significant query followed by the current request's stripped values

### Requirement: Application redirects are recorded for the server

Application code SHALL request SSR redirects only through the request-services boundary, which records the status and path in the render context and never writes the HTTP response. This SHALL cover URL-rewrite and Storyblok mapping fallbacks, category rewrites, the checkout-to-cart redirect, configurable-child parent redirects and missing-product redirects. URL-rewrite and Storyblok lowercase mapping redirects SHALL be recorded during initial navigation. A redirect recorded during initial navigation SHALL skip page data loading and storefront component rendering. Any redirect known before component rendering, including router redirects and redirects recorded during page data loading or queued data loading, SHALL skip rendering and server-prefetch work for the real application and its page components. Recorded redirects SHALL be sent exactly once by the server under the same Location, status, caching and tagging rules as router redirects; a redirect that must not be shared SHALL carry `no-cache`. Existing `no-cache` tags added during navigation, page data loading, or queued data loading SHALL be preserved and SHALL prevent cache writes, including for missing-product redirects to `/404`. Fresh and cached redirect responses SHALL contain no rendered storefront HTML, SHALL retain the existing short HTTP redirect message, and cached redirect entries SHALL store an empty body. Redirect processing MUST complete rather than leave the request pending. Category redirects first discovered during component server-prefetch retain their existing discovery timing.

#### Scenario: A recorded redirect is sent once and cached
- **WHEN** different visitors request a safely shareable page whose SSR processing records a redirect before component rendering
- **THEN** each response is exactly one redirect carrying that visitor's stripped values and no rendered storefront HTML, while retaining the short HTTP redirect message
- **AND** the redirect is resolved once without rendering the storefront, and the cached entry has an empty body and contains no visitor values

#### Scenario: A navigation-time redirect skips page data
- **WHEN** a navigation guard or mapping fallback records a redirect during initial navigation
- **THEN** no page data is loaded, no storefront component rendering or server-prefetch occurs, and the server sends the recorded redirect with the current request's stripped values appended
- **AND** the request completes without waiting for a page render

#### Scenario: URL-rewrite navigation avoids the not-found page
- **WHEN** initial navigation finds a URL rewrite for an otherwise unmatched path
- **THEN** the not-found page's data loading does not run or set a 404 status or `no-cache` tag
- **AND** the response is one redirect to the rewrite target, using 301 for a permanent rewrite and 302 otherwise, with no rendered storefront HTML
- **AND** without another cache exclusion, repeated requests populate and then hit the redirect cache

#### Scenario: Storyblok lowercase navigation avoids the not-found page
- **WHEN** an uppercase path has an existing lowercase Storyblok story
- **THEN** initial navigation records a 301 to the lowercase path before the not-found page's data loading can set a 404 status or `no-cache` tag
- **AND** no storefront component rendering or server-prefetch runs and the response contains no rendered storefront HTML
- **AND** without another cache exclusion, repeated requests populate and then hit the redirect cache; the lowercase existence lookup contributes no dependency tags, so when tagging is enabled the redirect carries only `redirect` plus any tags from other navigation work or lookups, with no new Storyblok-specific invalidation tags

#### Scenario: A missing product redirects without rendering
- **WHEN** missing-product page data loading records the existing redirect to `/404`
- **THEN** the real application and page render and server-prefetch hooks do not run
- **AND** the server completes one redirect with the existing status and Location and no rendered storefront HTML
- **AND** the existing `no-cache` tag is retained and no redirect entry is stored, allowing a later published product to be resolved afresh

#### Scenario: Checkout redirects without rendering
- **WHEN** checkout page data loading records the existing redirect to the cart
- **THEN** the real application and page render and server-prefetch hooks do not run
- **AND** the server completes one redirect with the existing status and localized Location and no rendered storefront HTML

#### Scenario: A configurable child redirects after queued data loading
- **WHEN** queued data loading records the existing configurable-child redirect to its parent
- **THEN** the real application and page render and server-prefetch hooks do not run
- **AND** the server completes one redirect with the existing 301 status and parent Location and no rendered storefront HTML

#### Scenario: A cookie-dependent recorded redirect is not shared
- **WHEN** fresh SSR processing records a redirect after reading a cookie not represented by the configured A/B dimension during navigation or page data loading
- **THEN** the server sends the current request's redirect once, without rendering the storefront, and does not cache the response

#### Scenario: Existing pre-render cache exclusions are retained
- **WHEN** navigation, page data loading, or queued data loading adds `no-cache` before a recorded redirect completes
- **THEN** skipping the storefront render retains that tag and prevents storing the redirect

## ADDED Requirements

### Requirement: URL-rewrite lookup tags identify the normalized request path

When cache tagging is available, every URL-rewrite lookup SHALL contribute both `url_rewrite` and `url_rewrite_<normalized request path>`, whether or not a rewrite is found. The normalized request path SHALL exclude the query, strip leading and trailing slashes, and use lowercase. Navigation fallbacks and Category rewrite checks SHALL use the same tag rule. A shareable redirect found by a rewrite lookup SHALL also receive the existing `redirect` tag when output-cache tagging is enabled. Authorized invalidation of the path tag SHALL remove cached responses dependent on that path, including a response cached before a rewrite was created. The existing output-cache TTL and redirect status policy SHALL remain unchanged.

#### Scenario: Equivalent request paths emit the same rewrite tag
- **WHEN** a rewrite lookup receives `/Old-Url`, `Old-Url/`, or `/Old-Url/?step=2`
- **THEN** its path-specific cache tag is `url_rewrite_old-url` and its bare `url_rewrite` tag is retained

#### Scenario: An in-place rewrite edit invalidates the cached redirect
- **WHEN** a shareable rewrite redirect has been cached with `redirect`, `url_rewrite`, and its normalized path tag, and authorized invalidation supplies that path tag after an in-place rewrite edit
- **THEN** the entry is removed, the next request resolves the updated target, and subsequent requests can hit the new entry

#### Scenario: A newly created rewrite invalidates an earlier lookup miss
- **WHEN** a cacheable response whose rewrite lookup found no rewrite has been stored, and authorized invalidation supplies its normalized path tag after a rewrite is created for that path
- **THEN** the earlier response is removed so the next request can discover the rewrite

#### Scenario: Category rewrite checks share tag normalization
- **WHEN** the existing Category rewrite check looks up a request path during component server-prefetch
- **THEN** it contributes the same bare and normalized path tags as a navigation-time lookup
- **AND** its redirect discovery remains in component server-prefetch rather than moving into page data loading

### Requirement: Redirect processing preserves output-hook side effects

Fresh redirect processing SHALL retain the existing before-output and after-output hooks, including their response-header side effects. Navigation and retained output-processing cookie reads SHALL remain subject to the existing cookie-dependency cache policy. Avoiding page rendering MUST NOT disable these hooks. Whenever a redirect is recorded, the template-processing stage SHALL be bypassed while both output hooks remain active; non-redirect template processing SHALL remain unchanged.

#### Scenario: Redirect hooks retain headers and execution
- **WHEN** a fresh request records a redirect before page rendering and an enabled before-output hook supplies a surrogate cache-tag header
- **THEN** both output hooks still run and the redirect response retains the header
- **AND** the cached redirect body remains empty and the response contains no rendered storefront HTML

#### Scenario: Unrendered-root metadata cannot replace the recorded redirect with an error
- **WHEN** a redirect is recorded before the real application root has rendered and the normal page template requires metadata fields initialized only by rendered layouts
- **THEN** redirect handling bypasses template processing, completes with the recorded status and Location rather than `/error`, and retains both output hooks

#### Scenario: A late before-output cookie read still prevents sharing
- **WHEN** a before-output hook reads a non-A/B cookie while handling a redirect whose page was not rendered
- **THEN** the existing cookie-dependency policy prevents caching that redirect

#### Scenario: Ordinary pages still render and process templates
- **WHEN** a request reaches the rendering stage without a recorded redirect
- **THEN** the real application and matched page retain their rendering and server-prefetch behavior and normal template and output-hook processing
