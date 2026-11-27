# Spec Delta

## ADDED Requirements

### Requirement: Backend page-load failures are not cached as successful pages

A category whose initial catalog load fails and a route whose backend lookup fails SHALL use the existing SSR error handling instead of a successful empty category or a false missing page. Failed page output SHALL NOT be stored under the original URL in the SSR output cache. A rejected category render SHALL retain the existing uncached redirect to `/error/`; a lookup failure handled by initial navigation SHALL retain the existing in-place HTTP 500 error-route render with `no-cache`. The `/error/` page SHALL retain its HTTP 500 response and cache opt-out. Keeping the original URL on the error page is not required.

#### Scenario: Cold category request fails and then recovers
- **WHEN** an uncached category URL is requested while its catalog search fails, and the same URL is requested after recovery
- **THEN** the failed request leads to the existing error page and creates no successful empty-category cache entry or cached error redirect
- **AND** the later request renders the products without waiting for cache expiry or changing the URL

#### Scenario: Empty and successful categories keep normal caching
- **WHEN** a category search completes successfully with zero hits or with products
- **THEN** existing page output-cache eligibility and lifetime remain unchanged
