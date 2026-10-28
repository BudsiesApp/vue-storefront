# Spec Delta

## Purpose

Let customers save the full-size original digital portrait associated with their order item, with consistent portrait selection and recoverable error feedback while retaining existing access restrictions.

## ADDED Requirements

### Requirement: Original portrait downloads accept both evidenced storage forms

The storefront SHALL download the full-size original from the configured QA-photo host for a stored filename or a filename preceded by the exact leading `budsies-qa-photos/` prefix. Only that prefix SHALL be removed; other path content SHALL remain unchanged. The host SHALL come from existing configuration, without rewriting stored records.

#### Scenario: Stored path includes the QA-photo prefix
- **WHEN** a customer downloads an available portrait stored as `budsies-qa-photos/portrait.jpg`
- **THEN** the request targets the configured QA-photo host's original `portrait.jpg`
- **AND** a successful response saves the full-size original as an image that can be opened, without a thumbnail or resize transformation
- **AND** the existing order-item-based suggested download filename is preserved

#### Scenario: Stored path contains only the filename
- **WHEN** a customer downloads an available portrait stored as `portrait.jpg`
- **THEN** the request targets the configured QA-photo host's original `portrait.jpg`
- **AND** a successful response saves the same full-size original with the existing suggested filename

#### Scenario: The configured QA-photo host differs from the saved example
- **WHEN** either supported storage form is used with a different configured QA-photo host
- **THEN** the request uses that configured host and the same original filename
- **AND** it does not depend on the production hostname captured in the ticket

#### Scenario: A path does not start with the exact QA-photo prefix
- **WHEN** a stored path does not start with the exact `budsies-qa-photos/` prefix
- **THEN** portrait-path normalization leaves its content unchanged
- **AND** it does not remove arbitrary slash-separated segments or infer another storage format

### Requirement: Portrait selection is consistent across existing page outputs

The storefront SHALL use the same original portrait URL for a deliverable's preview and download. Existing related-product links SHALL continue selecting the first deliverable's original portrait, with unchanged behavior for prefixed records and a configured-host original URL for filename-only records.

#### Scenario: Preview and download select a prefixed portrait
- **WHEN** a prefixed portrait is displayed and Download is activated for that deliverable
- **THEN** the preview source and download request identify the same original portrait

#### Scenario: Preview and download select a filename-only portrait
- **WHEN** a filename-only portrait is displayed and Download is activated for that deliverable
- **THEN** the preview source and download request identify the same configured-host original portrait
- **AND** the preview does not use a filename relative to the storefront page

#### Scenario: Related-product ordering uses a prefixed first deliverable
- **WHEN** an existing related-product link is generated with a prefixed first deliverable
- **THEN** its `image-url` query value remains the same original portrait URL as before this change
- **AND** product selection, destination route, first-deliverable selection, and click behavior remain unchanged

#### Scenario: Related-product ordering uses a filename-only first deliverable
- **WHEN** an existing related-product link is generated with a filename-only first deliverable
- **THEN** its `image-url` query value identifies that deliverable's configured-host original portrait, matching its preview and download
- **AND** the existing product and route selection remain unchanged

### Requirement: Download failures provide visible feedback and allow another attempt

A failed portrait download SHALL display a localized customer-visible error through the existing notification UI and SHALL leave another attempt possible without reloading. A failed image request SHALL NOT save its error response as an image or hide the available deliverables. A later successful attempt SHALL save the original through the normal download flow.

#### Scenario: Original image request returns HTTP 403
- **WHEN** a portrait download receives HTTP 403
- **THEN** the customer sees an error notification and no image is saved from that response
- **AND** Download remains available on the same page

#### Scenario: Original image request returns HTTP 404
- **WHEN** a portrait download receives HTTP 404
- **THEN** the customer sees an error notification and no image is saved from that response
- **AND** Download remains available on the same page

#### Scenario: Original image request fails at the network boundary
- **WHEN** a portrait download request rejects because of a network failure
- **THEN** the customer sees an error notification and no image is saved
- **AND** Download remains available on the same page

#### Scenario: The failure clears before a later attempt
- **WHEN** the customer activates Download again after any of these failures and the original image request now succeeds
- **THEN** a fresh request saves the correct full-size original without reloading the page
- **AND** the successful attempt does not produce a new failure notification

### Requirement: Existing access restrictions and working image downloads are preserved

The storefront SHALL retain the authenticated deliverables route and existing authenticated order-item retrieval contract. Download error handling SHALL NOT bypass a denied deliverables fetch. Successful shared artwork downloads SHALL retain their image source, suggested filename, browser-save behavior, and temporary-URL cleanup.

#### Scenario: Guest attempts to enter the deliverables route
- **WHEN** a guest navigates to the deliverables download route
- **THEN** the existing authentication guard still redirects to sign-in with the existing return-destination query

#### Scenario: Deliverables retrieval is denied
- **WHEN** the existing authenticated order-item deliverables request returns a non-success result
- **THEN** the page retains its existing unavailable state and does not expose a new download path
- **AND** the request retains the order item identifier and existing customer-token handling

#### Scenario: Shared artwork download succeeds
- **WHEN** the printout consumer downloads an artwork through the shared image downloader
- **THEN** its handler receives the same storage path and the original image is saved under the supplied filename
- **AND** its temporary blob URL is revoked after the save attempt as before
