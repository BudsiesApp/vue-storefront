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

### Requirement: Documented Maestra click tracking uses existing shared-output isolation
The storefront SHALL treat exact lowercase `m-message-click-id` as an ignored SSR query key under the existing clean-render/cache pipeline. Shared keys, HTML/state and cache entries SHALL exclude its visitor value while retaining significant queries, store/A-B dimensions and the current browser's own acquisition context. Other query-key normalization SHALL remain unchanged.

#### Scenario: Two visitors and query-free requests share clean output
- **WHEN** two synthetic visitors with different documented click values and a query-free request access an otherwise cacheable page in both arrival orders, cold and repeatedly to a hit
- **THEN** clean keys/render URLs and shared markup/full serialized state/cache entries MUST contain neither visitor's click value in encoded or decoded form
- **AND** requests differing only in this tracking value MUST reuse the clean entry, while existing functional/store/A-B dimensions continue separating output

#### Scenario: Disabled output caching still renders clean context
- **WHEN** a request containing the documented click key renders with output caching disabled
- **THEN** rendered shared HTML/current/previous route state MUST still use the existing clean URL rather than serialize that tracking value

#### Scenario: Only the documented key extends exact-name SSR policy
- **WHEN** other case variants, standalone `m-message-key-id`, inferred aliases, existing ignored keys or functional keys occur
- **THEN** their existing exact-name significance/normalization MUST remain unchanged; this addition MUST NOT introduce generic `m-*` stripping or standalone key-marker support

### Requirement: Maestra redirects retain only the current request's encoded tracking pairs
Fresh and cached SSR redirects SHALL append only the current request's stripped Maestra click pairs in original encoding, after destination query and before fragments, without overriding destination keys. Cached redirects SHALL remain clean. Browser hydration/capture SHALL retain the current browser URL, with existing error and pre-render trailing-slash behavior unchanged.

#### Scenario: Redirects preserve per-request ownership in both orders
- **WHEN** two visitors and a query-free request follow the same redirect query-free-first or parameterized-first, cold and on cache hits
- **THEN** each Location MUST contain only its own encoded click pairs, and the shared cached redirect/headers/body MUST contain neither visitor's stripped values

#### Scenario: Repeated values and destination precedence remain compatible
- **WHEN** the request has repeated or encoded click pairs and the destination has its own query key or fragment
- **THEN** existing destination-key precedence, original pair encoding/order, fragment placement and redirect status MUST remain unchanged

#### Scenario: Client acquisition receives its own marker after shared output
- **WHEN** a browser initializes after clean fresh/cached HTML or follows a redirect carrying that request's click marker
- **THEN** initial client capture MUST receive its own supported value from its current route, not a cached visitor value or server-generated attribution

### Requirement: Evidenced credential names are isolated from shared SSR representations
The storefront SHALL exclude `password` and `direct-crm-ticket` query pairs from clean SSR render URLs, page-cache keys and shared HTML/state/cache values, with output caching enabled or disabled. Matching SHALL decode URL names once and ignore ASCII case and hyphen/underscore separators for these protected names only. Other ignored-key policies and functional dimensions SHALL remain unchanged.

#### Scenario: Two credential-bearing visitors share clean output
- **WHEN** two synthetic visitors and a credential-free request access the same otherwise cacheable page in both arrival orders, cold and repeatedly to a hit
- **THEN** clean rendering and shared cache keys/values MUST contain neither visitor's protected values in raw or encoded form
- **AND** allowed significant query, store and configured A/B dimensions MUST continue separating output as before

#### Scenario: Equivalent names and repetitions do not fragment or leak
- **WHEN** requests contain mixed-case, hyphen/underscore-equivalent, percent-encoded, repeated or empty protected query pairs
- **THEN** every protected pair MUST be isolated from clean rendering and shared storage
- **AND** existing exact-name normalization for unrelated tracking keys MUST remain unchanged

#### Scenario: Output caching is disabled
- **WHEN** a request carrying protected fields renders without output caching
- **THEN** SSR markup and serialized current/previous route state MUST still exclude protected values

### Requirement: Credential isolation preserves only current-request redirect and browser context
Isolated credential pairs SHALL remain request-local and available to the current browser, never cached. Existing fresh and cached SSR redirect handling SHALL reattach only the current request's pairs in their original encoding, with destination precedence and fragments preserved. Attribution exclusion MUST NOT require stripping the browser URL or building a new authentication consumer.

#### Scenario: Fresh and cached redirects carry the current request only
- **WHEN** synthetic visitors with different protected pairs and a query-free request follow the same redirect in both arrival orders, cold and on hits
- **THEN** each Location MUST contain only its own current-request protected pairs, while the cached redirect and shared headers/body contain neither visitor's values
- **AND** allowed destination-query precedence, pair encoding, fragment placement and redirect status MUST remain compatible

#### Scenario: Browser hydration retains client inputs
- **WHEN** the browser initializes from clean HTML or follows a redirect with its own isolated query pairs
- **THEN** client-side route consumers MUST still receive that browser's current query context
- **AND** fresh attribution capture MUST exclude the selected fields independently, while old saved touches retain their explicit recleaning exemption

#### Scenario: Pre-render and error redirects retain their established routing
- **WHEN** a credential-bearing request takes the existing trailing-slash redirect or a render/error failure path
- **THEN** protection MUST retain existing routing/status behavior and MUST NOT share a visitor-specific credential-bearing redirect entry

### Requirement: Explicit SSR diagnostic URL fields exclude selected fresh query values
The explicit request-URL arguments in first-party SSR timing/cache/completion/error diagnostics SHALL omit the two selected query names without mutating the live request. Existing exception details, hook inputs and failure handling SHALL remain unchanged absent an actual protected-value producer/path; opaque errors or arbitrary injected strings SHALL NOT justify blanket suppression or a replacement diagnostic request contract.

#### Scenario: Cache timing and completion log a protected URL
- **WHEN** a request containing a protected query field reaches cache miss, cache hit, redirect or render completion logging
- **THEN** the logged URL MUST exclude protected query pairs and MUST NOT log request-local stripped-query content

#### Scenario: A response or terminal diagnostic includes the request URL
- **WHEN** a fresh selected-name request reaches response-already-sent, render/resource-error, asynchronous write-failure or terminal-failure URL logging
- **THEN** that explicit URL field MUST omit the selected pairs while preserving unrelated URL data, existing operation identifiers, ordinary exception detail and response/cleanup containment
- **AND** the live request and original exception-hook arguments MUST remain unchanged; no generic error/request wrapper or global logger is required
