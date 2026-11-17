# Spec Delta

## ADDED Requirements

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
