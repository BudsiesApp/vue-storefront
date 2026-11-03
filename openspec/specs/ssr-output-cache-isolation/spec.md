# ssr-output-cache-isolation Specification

## Purpose

Make shared server-rendered storefront responses independent of visitor values omitted from their cache keys, while keeping each visitor's own query values on redirects, client query flows and country-correct first paint across brands.

## Requirements

### Requirement: Shared HTML excludes stripped visitor query values

Cacheable HTML SHALL be rendered from the normalized path and query represented by its cache key. Markup and the entire serialized initial state MUST exclude request values from stripped query parameters, including previous-route state and dynamically mapped route parameters. Requests carrying only stripped tracking parameters SHALL remain eligible for cache hits. This behavior SHALL apply across brands.

#### Scenario: Two visitors share clean HTML
- **WHEN** two visitors request the same page with different synthetic email, artwork, coupon and tracking values, in either order, starting with an empty cache and repeating requests to reach a hit
- **THEN** their response bodies are identical and the whole HTML, including markup and serialized current and previous routes, contains neither visitor's stripped values in decoded or encoded form
- **AND** tracking-only requests reuse the clean entry rather than bypassing the cache

### Requirement: Redirects forward the current request's stripped parameters

Every SSR redirect, whether produced by a router redirect or recorded by application code, SHALL be resolved while rendering the clean URL represented by the cache key. When the server sends a redirect, after a fresh render or from a cache hit, it SHALL append the current request's stripped query pairs to the Location in their original encoding, after the Location's own query and before any fragment, without overriding a key the Location already contains. A cached redirect SHALL store the Location resolved from the clean URL, SHALL contain no stripped visitor values and SHALL be shared by requests that differ only in stripped parameters. Error redirects and the pre-render trailing-slash redirect SHALL keep their existing behavior. No route-specific sign-in exception SHALL be required.

#### Scenario: Each visitor receives their own stripped values on redirects
- **WHEN** two visitors with different stripped values request a redirect, in both orders, for each of forwarding, inherited and explicit query policies, with cold and prewarmed cache states
- **THEN** each Location contains the route's query resolved from the clean URL followed only by that request's stripped values, with the existing redirect status
- **AND** one cached entry serves every request and contains neither visitor's values

#### Scenario: Query-free and parameterized requests share one redirect entry
- **WHEN** a query-free request and a parameterized request follow the same redirect in each order and are repeated
- **THEN** the query-free request receives the cached Location unchanged and the parameterized request receives it with its own stripped values appended
- **AND** the redirect is rendered once

#### Scenario: Query-free redirects remain cacheable
- **WHEN** a redirect receives repeated requests without stripped parameters
- **THEN** the first request populates the cache and the next request uses the cached status and Location

#### Scenario: Router redirects resolve once from the clean URL
- **WHEN** a route whose redirect omits an explicit query receives a URL containing significant and stripped query parameters
- **THEN** a single navigation of the clean URL detects the redirect without loading page data
- **AND** the Location contains the inherited significant query followed by the current request's stripped values

### Requirement: Application redirects are recorded for the server

Application code SHALL request SSR redirects only through the request-services boundary, which records the status and path in the render context and never writes the HTTP response. This SHALL cover URL-rewrite and Storyblok mapping fallbacks, category rewrites, the checkout-to-cart redirect, configurable-child parent redirects and missing-product redirects. A redirect recorded during initial navigation SHALL skip page data loading. Recorded redirects SHALL be sent by the server under the same Location, caching and tagging rules as router redirects; a redirect that must not be shared SHALL carry `no-cache`.

#### Scenario: A recorded redirect is sent once and cached
- **WHEN** different visitors request a page whose render records a redirect, with and without a country dependency
- **THEN** each response is exactly one redirect carrying that visitor's stripped values, with no page body
- **AND** the page renders once and cached entries contain no visitor values

#### Scenario: A navigation-time redirect skips page data
- **WHEN** a navigation guard or mapping fallback records a redirect during initial navigation
- **THEN** no page data is loaded and the server sends the recorded redirect with the current request's stripped values appended

### Requirement: Redirect entries can be invalidated

When output-cache tagging is enabled, every cached redirect SHALL carry the `redirect` tag in addition to applicable page and variation tags. The tag SHALL be accepted by cache invalidation and included in wildcard invalidation.

#### Scenario: Redirect tag and wildcard remove redirects
- **WHEN** output-cache tagging is enabled and a cached redirect is invalidated through the authorized invalidation endpoint using `tag=redirect` or, after reseeding, `tag=*`
- **THEN** the entry is removed and the next query-free request resolves afresh

### Requirement: Country-dependent output preserves first paint

Only responses that read `detected_country` during SSR SHALL use country variants. A base marker SHALL select a US or INTL entry without rendering a different visitor's country content. A trimmed, upper-cased US value or a missing or blank cookie SHALL select US; every other country value SHALL select INTL. When output-cache tagging is enabled, marker and variants SHALL carry normal page tags and `detected_country`. Entries SHALL respect the existing cache lifetime.

#### Scenario: Country pages cache distinct first paints
- **WHEN** US and FR visitors request a country-dependent page in each order, starting cold and repeating until each bucket hits
- **THEN** the base entry is a marker and each bucket has its own cached label and Holiday options
- **AND** each response already contains the current bucket's content before hydration

#### Scenario: Missing or blank country uses the US bucket
- **WHEN** a country-dependent request has an absent, empty or whitespace-only cookie
- **THEN** cold rendering and marker lookups both select the US bucket

#### Scenario: Country-independent pages retain a single entry
- **WHEN** US and FR requests render a page that never reads the country cookie
- **THEN** both orders populate and reuse one normal entry with no country marker or variants

#### Scenario: Page and country tags remove every country entry
- **WHEN** output-cache tagging is enabled, both buckets have been cached and an authorized request invalidates a normal page tag or, after reseeding, `detected_country` or `*`
- **THEN** the marker and both variants are removed and subsequent requests render fresh content

### Requirement: Cookie dependencies cannot silently become shared output

SSR cookie reads SHALL be recorded separately for each render, including reads of absent cookies. A response that reads a cookie other than the configured A/B key or a registered cache variation SHALL receive `no-cache`, SHALL produce no normal, redirect, marker or variant write, and SHALL log the dependency once per request without logging cookie values. Existing `no-cache` tags SHALL retain the same precedence. Component request services MUST remain narrow and MUST NOT expose tracking or cache-tag internals.

#### Scenario: An unregistered cookie disables all writes
- **WHEN** a render reads a synthetic unregistered cookie, repeatedly or when absent, alone or alongside country and A/B cookies, or already carries `no-cache`
- **THEN** no response entry or marker is stored, the response carries `no-cache`, and repeated reads produce at most one dependency warning for that request
- **AND** interleaved renders retain separate dependency sets

### Requirement: Cache dimensions and key normalization remain compatible

Store code, significant query parameters and the configured A/B group SHALL continue separating cached output, including country markers and variants. Existing ignored-query normalization SHALL remain unchanged. Country-specific output MUST NOT be served from a different store or A/B group.

#### Scenario: Store and A/B dimensions compose with country
- **WHEN** synthetic requests vary store code, A/B group and country bucket in both orders and repeat to reach hits
- **THEN** normal entries, redirects, markers and variants remain separated by the applicable dimensions

#### Scenario: Page-key behavior is preserved
- **WHEN** existing cache-key examples and additional repeated, blank, encoded and significant query cases are evaluated
- **THEN** ignored keys still have no effect on the page key, significant keys still distinguish it, the clean render URL matches that key's normalized path and query, and the stripped query keeps the request's ignored pairs in their original encoding

### Requirement: Holiday location and client query behavior remain compatible

The Holiday composable and pre-render cache selection SHALL use the same country classification. Client location precedence SHALL be persisted shipping country, then detected cookie, then the US fallback defined by the Holiday location requirement; manual location changes SHALL remain intact. Coupon, artwork, attribution and product-customization query flows SHALL remain intact. The browser's current URL SHALL remain available after hydration.

#### Scenario: Shared country rule agrees with Holiday location
- **WHEN** the location helper and composable receive US, lowercase or padded US, FR, empty or missing country values
- **THEN** their automatic classification agrees with cache selection, empty or missing values select US, and existing persisted-country and manual overrides still apply

### Requirement: Sent responses are never cached or sent twice

After application code has sent the HTTP response, SSR completion and error handling MUST NOT modify headers, cache any output or send another response. The server SHALL contain failures from rendering, output handling, cache operations and cleanup without an escaping promise rejection or a global unhandled-rejection handler. Cache writes SHALL run without delaying the response for write completion; write failures SHALL be logged without invoking response error handling.

#### Scenario: Application redirect owns the response
- **WHEN** a synthetic render nevertheless sends a direct application redirect, either during initial navigation or later rendering, with and without cache tags
- **THEN** no later cache write, header mutation, second redirect or end occurs and no exception escapes
- **AND** initial-navigation completion skips page data loading after the response is sent, and a subsequent request can still be handled

#### Scenario: Response and cleanup failures are contained
- **WHEN** rendering or cache work fails before or after headers are sent, or the error handler or render cleanup throws
- **THEN** render and lookup failures retain existing error redirects only for unsent responses, asynchronous write failures are logged without a redirect, cleanup is attempted, and terminal logging catches contain all remaining rejection paths
