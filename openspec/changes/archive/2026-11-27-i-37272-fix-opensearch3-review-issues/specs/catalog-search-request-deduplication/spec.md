# Spec Delta

## ADDED Requirements

### Requirement: Catalog failures reject consistently

Every catalog search caller SHALL receive a rejected search on backend or transport failure, in the browser and during SSR. Failures MUST NOT resolve to synthetic empty/offline search results or be saved as successful query-cache entries. The existing cache of successful results, including browser in-memory results, SHALL remain available with unchanged expiry behavior. A successful zero-hit response SHALL remain a successful empty result. Other catalog consumers SHALL keep their existing presentation/error handling; this requirement introduces no new messages for them.

#### Scenario: Backend failure is not an empty result
- **WHEN** a catalog request produces an API/engine error response, a network failure, invalid JSON or a null response
- **THEN** browser and SSR callers receive a rejection instead of an empty search result
- **AND** the next identical uncached search can request the backend again

#### Scenario: A successful empty search is still empty
- **WHEN** the backend successfully returns a search with zero hits
- **THEN** the caller receives the normal empty search result, not a rejection

#### Scenario: A prior successful result remains reusable
- **WHEN** an identical search has a successful entry in the existing query cache
- **THEN** it can return that result without a backend request, under the existing cache policy

## MODIFIED Requirements

### Requirement: Settled requests are not reused as in flight
A catalog search that has completed, successfully or not, SHALL stop being shared as pending. Later identical searches SHALL follow the normal catalog query cache behavior. A search that starts after a failure SHALL send a new backend request. Source: D1.

#### Scenario: Identical search after completion
- **WHEN** an identical catalog search starts after a previous one completed successfully
- **THEN** it is answered by the existing catalog query cache behavior and does not wait on the completed request

#### Scenario: Shared request fails
- **WHEN** a coalesced catalog request fails in the browser or during SSR
- **THEN** every waiting caller receives a rejection, with no synthetic empty/offline result cached or returned
- **AND** the next identical catalog search sends a new backend request
