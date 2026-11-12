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
- **WHEN** different visitors request a safely shareable page whose render records a redirect
- **THEN** each response is exactly one redirect carrying that visitor's stripped values, with no page body
- **AND** the page renders once and the cached entry contains no visitor values

#### Scenario: A navigation-time redirect skips page data
- **WHEN** a navigation guard or mapping fallback records a redirect during initial navigation
- **THEN** no page data is loaded and the server sends the recorded redirect with the current request's stripped values appended

#### Scenario: A cookie-dependent recorded redirect is not shared
- **WHEN** a fresh render records a redirect after reading a cookie not represented by the configured A/B dimension
- **THEN** the server sends the current request's redirect once and does not cache the response

### Requirement: Redirect entries can be invalidated

When output-cache tagging is enabled, every cached redirect SHALL carry the `redirect` tag in addition to applicable page tags. The tag SHALL be accepted by cache invalidation and included in wildcard invalidation.

#### Scenario: Redirect tag and wildcard remove redirects
- **WHEN** output-cache tagging is enabled and a cached redirect is invalidated through the authorized invalidation endpoint using `tag=redirect` or, after reseeding, `tag=*`
- **THEN** the entry is removed and the next query-free request resolves afresh

### Requirement: Cookie dependencies cannot silently become shared output

SSR cookie reads SHALL be recorded separately per render, including absent cookies and late output processing. Before caching, any read other than the configured A/B cookie SHALL prevent sharing and produce `no-cache`, independently of tagging settings. Each such cookie name SHALL be logged at most once per request without its value. Existing `no-cache` SHALL take precedence, and component request services SHALL remain narrow.

#### Scenario: An unregistered cookie disables all writes
- **WHEN** a fresh render reads a synthetic non-A/B cookie, repeatedly or when absent, alone or alongside A/B cookies, or already carries `no-cache`
- **THEN** no response is stored, the response carries `no-cache`, and repeated reads produce at most one dependency warning for that request
- **AND** interleaved renders retain separate dependency sets and never log cookie values

#### Scenario: Late cookie reads are classified before writing
- **WHEN** an output hook or template processing reads a non-A/B cookie after the application render
- **THEN** that read prevents every cache write, so no cookie-derived response is stored for later visitors

#### Scenario: Detected country is not an exception to the safeguard
- **WHEN** a fresh render outside the neutral Holiday path reads the detected-country cookie during SSR
- **THEN** it is not cached rather than being assigned a country variant or silently shared

### Requirement: Cache dimensions and key normalization remain compatible

Store code, significant query parameters and the configured A/B group SHALL continue separating cached output. Visitor-controlled A/B values SHALL be encoded so distinct groups cannot address each other's entries. Existing ignored-query normalization SHALL remain unchanged. Country cookies SHALL NOT add a cache dimension; safe shared responses SHALL retain existing cache lifetime and page-tag invalidation behavior.

#### Scenario: Store and A/B dimensions compose with country
- **WHEN** synthetic requests vary store code, A/B group and country cookie in both orders and repeat to reach hits
- **THEN** normal responses and redirects remain separated by store and A/B group while country-only differences reuse the same safe response

#### Scenario: A crafted A/B value cannot address a country variant
- **WHEN** a visitor sends an A/B value containing separators or resembling a former country suffix after another group warmed a response
- **THEN** that request neither reads nor overwrites the other group's entry

#### Scenario: Page-key behavior is preserved
- **WHEN** existing cache-key examples and additional repeated, blank, encoded and significant query cases are evaluated
- **THEN** ignored keys still have no effect on the page key, significant keys still distinguish it, the clean render URL matches that key's normalized path and query, and the stripped query keeps the request's ignored pairs in their original encoding

#### Scenario: Safe shared Holiday responses respect invalidation and lifetime
- **WHEN** a shared Holiday response expires or an authorized request invalidates its page tag or wildcard tags with tagging enabled
- **THEN** the next request renders a fresh neutral response and subsequent requests reuse it without country variants

### Requirement: Holiday location and client query behavior remain compatible

After browser readiness, Holiday location SHALL use persisted shipping country, then detected cookie, then US, with manual changes retained. If saved data is unreadable, it SHALL resolve via detected cookie/US rather than stay loading, preserving valid selections. SSR SHALL NOT choose a visitor location or use country cache selection. Coupon, artwork, attribution and customization query flows SHALL remain intact, with the browser's current URL available after hydration.

#### Scenario: Shared country rule agrees with Holiday location
- **WHEN** browser shipping-data loading completes with US, lowercase or padded US, FR, empty or missing country values
- **THEN** nonblank persisted shipping country takes precedence over the cookie, US variants select domestic, other nonblank countries select international, and blank or missing sources ultimately select US
- **AND** manual overrides remain intact

#### Scenario: Current browser query remains usable after neutral hydration
- **WHEN** a visitor opens a cached page with synthetic artwork, coupon, attribution and product-customization query values
- **THEN** browser query consumers receive that visitor's supported values after hydration without injecting those values into shared HTML or cached redirects

#### Scenario: Storage failure resolves only in this browser
- **WHEN** a browser hydrates shared neutral HTML but cannot read saved customer data
- **THEN** it resolves Holiday content from its detected country or US fallback, preserves valid current selections and allows manual location change
- **AND** that browser-only fallback does not alter shared HTML, cached redirects or cache dimensions

### Requirement: Sent responses are never cached or sent twice

After application code has sent the HTTP response, SSR completion and error handling MUST NOT modify headers, cache any output or send another response. The server SHALL contain failures from rendering, output handling, cache operations and cleanup without an escaping promise rejection or a global unhandled-rejection handler. Cache writes SHALL run without delaying the response for write completion; write failures SHALL be logged without invoking response error handling.

#### Scenario: Application redirect owns the response
- **WHEN** a synthetic render nevertheless sends a direct application redirect, either during initial navigation or later rendering, with and without cache tags
- **THEN** no later cache write, header mutation, second redirect or end occurs and no exception escapes
- **AND** initial-navigation completion skips page data loading after the response is sent, and a subsequent request can still be handled

#### Scenario: Response and cleanup failures are contained
- **WHEN** rendering or cache work fails before or after headers are sent, or the error handler or render cleanup throws
- **THEN** render and lookup failures retain existing error redirects only for unsent responses, asynchronous write failures are logged without a redirect, cleanup is attempted, and terminal logging catches contain all remaining rejection paths

### Requirement: Holiday SSR output is visitor-independent

Shared Holiday pages SHALL render a neutral loading state during SSR and initial hydration, without visitor-derived country labels, delivery promises or selectable rush options. Once browser location data is ready, the widget SHALL display that visitor's applicable content. Different country cookies SHALL reuse one safe response within the existing store, significant-query and A/B dimensions, without country cache variants.

#### Scenario: Different visitors receive the same neutral Holiday HTML
- **WHEN** visitors with US, FR, blank and absent country cookies request the same Holiday page in both request orders, starting cold and repeating to reach cache hits
- **THEN** each receives identical neutral HTML and serialized state, without a visitor-derived location, promise or option selection
- **AND** the requests populate and reuse one shared response rather than country markers or variants

#### Scenario: Hydration waits for this browser's location
- **WHEN** a browser hydrates the shared Holiday response while its persisted shipping data is still loading
- **THEN** its initial widget markup matches the neutral SSR markup and exposes a non-interactive accessible loading state
- **AND** country labels, promises and rush controls appear only after that browser's location is ready

#### Scenario: Country-independent pages continue sharing
- **WHEN** US and FR visitors request a page without Holiday content in either order
- **THEN** they reuse one safe response within their existing store and A/B group

### Requirement: AppLovin tracking keys participate in existing output-cache isolation
The storefront SHALL treat the documented lowercase `aleid` and `alart` query names as attribution-only ignored keys under the existing SSR cache/clean-render rules, retaining their request-specific browser and redirect behavior without changing other query-key normalization or functional cache dimensions.

#### Scenario: Different AppLovin clicks share visitor-independent HTML
- **WHEN** two requests differ only in lowercase `aleid`/`alart` values for the same otherwise cacheable page, including a query-free request, cold access and repeated cache hits
- **THEN** they MUST share the same clean page key/render URL, and shared HTML and serialized initial route/state MUST contain neither request's stripped click values
- **AND** significant query parameters, store code, and existing configured cache dimensions MUST continue distinguishing output as before

#### Scenario: Redirects carry only the current request's click values
- **WHEN** an SSR redirect covered by the existing output-cache pipeline is rendered or served from cache for a request containing lowercase AppLovin query pairs
- **THEN** the Location MUST append only that request's stripped AppLovin pairs in their existing original encoding, after the redirect's own query and before any fragment, without replacing keys already supplied by the destination
- **AND** the cached redirect MUST remain clean and contain neither visitor's click values, including when query-free and parameterized requests arrive in either order

#### Scenario: Browser acquisition still sees the visitor's current identifiers
- **WHEN** the browser initializes after a clean cached response or follows a redirect carrying that request's AppLovin values
- **THEN** its initial raw-query capture MUST receive that visitor's supported values from the current browser URL rather than another visitor's values or a server-synthesized attribution object

#### Scenario: Other query policies remain unchanged
- **WHEN** a URL also contains existing ignored keys or functional query parameters
- **THEN** existing ignored-key handling, exact-name cache normalization, redirect destination precedence, and functional parameter significance MUST remain unchanged except for adding the two documented lowercase AppLovin names; error and pre-render trailing-slash redirects MUST keep their existing behavior
