# Spec Delta

## Purpose

Prevent redundant concurrent catalog (product) search requests when several storefront components need the same data before any of them has received it, without limiting any caller to less data than it requested.

## ADDED Requirements

### Requirement: Concurrent identical catalog requests are coalesced
The storefront SHALL send at most one catalog search request to the backend for a set of identical catalog searches that are pending at the same time. Searches are identical when the existing catalog query cache would treat them as the same request: entity type, store, query, paging, sort, and field projection. Every caller of a coalesced search SHALL receive the result of that single backend request.

#### Scenario: Several components request the same missing product
- **WHEN** several components on one page request the same product with identical catalog searches before the product is in the store or the catalog query cache
- **THEN** exactly one catalog request for that search is sent to the backend
- **AND** every component receives the product data

#### Scenario: Forevers page price directives
- **WHEN** the Storyblok Forevers page (`/forevers-pet-plush/`) renders several rich-text blocks with price directives for the `ForeversDog_bundle` product, during SSR or on client-side navigation
- **THEN** exactly one catalog request for that product search is sent in that rendering environment

#### Scenario: Different searches are not coalesced
- **WHEN** two pending catalog searches differ in store, query, paging, or sort
- **THEN** each search sends its own backend request

### Requirement: Single-product lookups share the list search shape
A single-product lookup by a key (for example `id` or `sku`) SHALL issue the same catalog search as a list search that filters that key by a one-value list with the same paging, sort, and field projection, so that both can be coalesced. The lookup SHALL return the same product as before.

#### Scenario: Forevers page payment and structured data blocks
- **WHEN** the customer navigates client-side to the Storyblok Forevers page (`/forevers-pet-plush/`) and its PayPal Pay Later, Affirm, and product structured data blocks load product `73` at the same time
- **THEN** exactly one catalog request for that product is sent
- **AND** every block receives the product data

#### Scenario: Payment message blocks reuse loaded product data
- **WHEN** the PayPal Pay Later or Affirm Storyblok block needs a product that is already in the product store, for example after a full page load of the Forevers page
- **THEN** the block uses that product
- **AND** no catalog request is sent for it

#### Scenario: Payment message blocks do not load during SSR
- **WHEN** a page with PayPal Pay Later or Affirm Storyblok blocks is rendered on the server
- **THEN** these blocks send no catalog request

#### Scenario: Single-product lookup result is unchanged
- **WHEN** a product is loaded by SKU or ID through a single-product lookup
- **THEN** the same product is returned as with the previous exact-match filter

### Requirement: Field projection is part of request identity
Catalog searches with different field projections (included or excluded fields) SHALL NOT be coalesced. A caller that requests full product data MUST NOT receive the result of a pending request that uses a narrower projection.

#### Scenario: Full load concurrent with a category list load
- **WHEN** a full-data load and a Category page list-projection load for the same product are pending at the same time
- **THEN** each sends its own backend request
- **AND** the full-data caller receives every product field, including those the list projection excludes

### Requirement: Coalescing does not limit post-processing detail
Each caller of a coalesced search SHALL apply its own post-processing options to the shared result. This includes bundle product prefetching and product configuration. A caller that requests more detail MUST receive it even when it shares the request with a caller that requests less.

#### Scenario: Prefetching and non-prefetching callers share a request
- **WHEN** a caller with bundle prefetching and a caller without it issue identical catalog searches for a bundle product at the same time
- **THEN** the prefetching caller receives the bundle option products
- **AND** the non-prefetching caller receives the product without them

### Requirement: Coalesced results are isolated per caller
Each caller of a coalesced catalog search SHALL receive its own independent copy of the search result. Changes one caller makes to its result MUST NOT affect another caller's result or the cached result.

#### Scenario: One caller modifies its result
- **WHEN** two callers receive the result of the same coalesced search and one of them changes its returned product objects
- **THEN** the other caller's product objects remain unchanged

### Requirement: Settled requests are not reused as in flight
A catalog search that has completed, successfully or not, SHALL stop being shared as pending. Later identical searches SHALL follow the normal catalog query cache behavior. A search that starts after a failure SHALL send a new backend request.

#### Scenario: Identical search after completion
- **WHEN** an identical catalog search starts after a previous one completed successfully
- **THEN** it is answered by the existing catalog query cache behavior and does not wait on the completed request

#### Scenario: Shared request fails
- **WHEN** a coalesced catalog request fails
- **THEN** every waiting caller gets the failure handling it already has for a failed catalog request
- **AND** the next identical catalog search sends a new backend request
