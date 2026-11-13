# Spec Delta

## ADDED Requirements

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
- **AND** attribution state and forwarding MUST exclude the protected fields independently

#### Scenario: Pre-render and error redirects retain their established routing
- **WHEN** a credential-bearing request takes the existing trailing-slash redirect or a render/error failure path
- **THEN** protection MUST retain existing routing/status behavior and MUST NOT share a visitor-specific credential-bearing redirect entry

### Requirement: SSR diagnostics exclude protected request values without mutating the live request
First-party SSR timing/cache/error diagnostics and the SSR exception-reporting view SHALL exclude protected query values. A credential-bearing request's free-form error or request object MUST NOT be serialized into diagnostics. Normal request handling, current-user inputs and noncredential-request diagnostic behavior SHALL remain intact.

#### Scenario: Cache timing and completion log a protected URL
- **WHEN** a request containing a protected query field reaches cache miss, cache hit, redirect or render completion logging
- **THEN** the logged URL MUST exclude protected query pairs and MUST NOT log request-local stripped-query content

#### Scenario: A raw error repeats a protected request value
- **WHEN** a credential-bearing request fails during render, cache lookup/write, output processing, exception reporting or final cleanup and its error includes the synthetic protected value
- **THEN** the first-party diagnostic and exception-reporting view MUST contain only safe operation/type/status and credential-free URL context, not the raw error/request object
- **AND** the original live request MUST remain unchanged and existing response/cleanup containment MUST remain effective
