# route-lookup-failure-propagation Specification

## Purpose

Keep unsuccessful backend route lookups distinct from successful missing-record responses so customers see the existing error page rather than a false page-not-found result.

## Requirements

### Requirement: Route lookup failures remain failures

Failed URL-mapping, Storyblok story/existence and url-rewrite requests SHALL reject route resolution in both SSR and browser navigation. A lookup failure MUST NOT become a successful missing record, continue the missing-route fallback chain or register a page-not-found mapping. The existing error route SHALL handle failed resolution without new page design or copy.

#### Scenario: URL-mapping request fails
- **WHEN** URL mapping receives a non-success HTTP response, a transport failure or an unreadable JSON response
- **THEN** route resolution rejects and the storefront uses the existing error page instead of page-not-found

#### Scenario: Storyblok returns an error envelope
- **WHEN** a story or existence lookup returns an API error code or its request fails
- **THEN** route resolution rejects rather than treating the route as missing, even when the request transport resolves with an error envelope

#### Scenario: URL-rewrite lookup fails
- **WHEN** a url-rewrite lookup returns an API code other than 200 or 404, or fails in transport
- **THEN** route resolution rejects and the existing error page is shown

### Requirement: Successful route misses keep existing fallback behavior

A successful null URL mapping, a successful absent-story response, a successful false story-existence response and a url-rewrite 404 SHALL retain their existing no-match meaning. A route absent from every successful lookup SHALL still reach page-not-found. Successful mappings and redirects SHALL remain unchanged.

#### Scenario: Route is genuinely missing
- **WHEN** all enabled lookups complete successfully with their existing no-match responses
- **THEN** the storefront shows page-not-found rather than the error page

#### Scenario: Failed route can resolve on a later request
- **WHEN** a failed lookup is retried after the backend recovers
- **THEN** no missing-route or failed-story entry from the failure prevents successful resolution
