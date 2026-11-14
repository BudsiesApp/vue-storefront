# Spec Delta

## ADDED Requirements

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
