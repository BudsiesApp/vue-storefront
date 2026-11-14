# traffic-attribution-capture Specification

## Purpose

Preserve raw browser acquisition context for Magento attribution while retaining the storefront's existing First Touch, Last Touch, filtering, and cart-lifecycle reporting contracts.

## Requirements

### Requirement: AppLovin identifiers qualify initial acquisition landings
The storefront SHALL recognize `aleid` and `alart` as coarse acquisition-key signals on initial client-side SPA landings under the existing configured-key gate, without requiring UTM source/medium or an external referrer and without classifying the traffic itself.

#### Scenario: Either identifier replaces Last Touch without UTMs
- **WHEN** an unexpired First Touch exists and a different initial browser landing contains `aleid`, `alart`, or both after existing raw query normalization/filtering, with no UTM source/medium or usable external referrer, and those keys are in the effective acquisition list
- **THEN** the captured raw touch MUST qualify for the existing Last Touch update path while the unexpired First Touch remains unchanged

#### Scenario: Acquisition key names retain case-insensitive matching
- **WHEN** a captured AppLovin identifier key differs in case from its configured acquisition-key name
- **THEN** it MUST qualify under the same existing case-insensitive gate while the raw payload preserves its submitted key/value according to existing route normalization

#### Scenario: First capture and non-acquisition landings retain their lifecycle
- **WHEN** there is no unexpired First Touch, or a later initial landing has only empty/null AppLovin values removed by existing normalization and no other acquisition signal
- **THEN** the first-capture case MUST continue initializing both touches from the same raw payload, and the later non-acquisition case MUST leave the existing touches unchanged

### Requirement: AppLovin acquisition defaults and configured lists remain coherent
Both the storefront's shipped configuration and the acquisition gate's fallback SHALL include `aleid` and `alart`, retaining all existing keys and the existing rule that an explicit configured acquisition list replaces the fallback.

#### Scenario: Shipped configuration and absent configuration support the same keys
- **WHEN** the storefront uses the shipped acquisition configuration or has no configured acquisition-key array
- **THEN** either AppLovin key MUST qualify an otherwise identifier-only landing, alongside the existing supported click identifiers

#### Scenario: An explicit override remains authoritative
- **WHEN** an explicit acquisition-key array excludes AppLovin identifiers and no UTM/referrer/other configured acquisition signal is present
- **THEN** AppLovin key presence alone MUST NOT bypass that override through a new forced union with fallback keys

### Requirement: AppLovin capture preserves raw query and privacy boundaries
The storefront SHALL retain captured AppLovin query values through the existing raw-touch format and sensitive-key filtering, without synthesizing reportable UTM fields, classifying source/channel/platform, or moving identifiers into the clean landing URL or another field.

#### Scenario: AppLovin context is captured without enrichment
- **WHEN** an initial landing carries one or both AppLovin identifiers, optionally alongside the configured campaign's explicit UTMs and sensitive operational parameters
- **THEN** the filtered `query_params` MUST retain the AppLovin identifiers and supplied UTMs under existing raw route-value normalization, sensitive parameters MUST remain excluded, and `landing_page_url` MUST contain only origin/path without query values
- **AND** the raw touch MUST retain existing optional referrer and detection-time fields without adding derived channel/platform, synthetic UTMs, session ID, or touch-type fields

### Requirement: AppLovin Last Touch uses existing reporting semantics
AppLovin touches SHALL use the existing client-only storage and cart-lifecycle reporting flow, retaining sent flags, First Touch-before-Last Touch ordering, duplicate/in-flight suppression, and non-blocking failure behavior without introducing new capture or reporting triggers.

#### Scenario: A new AppLovin Last Touch is reported through the existing cart event
- **WHEN** a captured different AppLovin Last Touch is unsent and an existing cart-created or cart-connected event requests attribution reporting
- **THEN** the storefront MUST submit the stored raw payload through the existing queued POST body `{ "request": <raw touch> }`, after First Touch if it is unsent, and mark each touch sent only after its successful response
- **AND** Magento MUST remain responsible for classification of the received raw context

#### Scenario: Existing duplicate and failure handling remains applicable
- **WHEN** an AppLovin touch duplicates an already eligible raw payload, reporting is already in flight, or a submission fails
- **THEN** the existing duplicate/in-flight rules and unsent-on-failure behavior MUST remain effective without blocking cart/checkout or adding a new retry mechanism

#### Scenario: Internal route navigation does not become acquisition capture
- **WHEN** AppLovin query parameters appear only after the initial SPA synchronization, or the module executes during SSR
- **THEN** this extension MUST NOT introduce route-change capture, immediate reporting, SSR touch capture, or a replacement for the existing client-only lifecycle

### Requirement: Documented Maestra clicks qualify initial acquisition under existing defaults
Both shipped and fallback acquisition lists SHALL include `m-message-click-id`. A nonblank normalized click value SHALL qualify a different initial client landing through the existing gate when the effective list permits it. Explicit configured arrays SHALL retain replacement authority; standalone key markers or inferred aliases SHALL NOT gain eligibility from this extension.

#### Scenario: Retained First Touch and a click-only return
- **WHEN** an unexpired Google First Touch exists and a different initial return landing contains only a nonblank documented click marker under the effective acquisition list
- **THEN** First Touch and its metadata MUST remain unchanged and Last Touch MUST become that new unsent raw touch without fabricated UTMs or client classification

#### Scenario: Actual shipped and fallback defaults agree
- **WHEN** capture uses acquisition keys from the shipped template or no configured acquisition array
- **THEN** the documented click marker MUST qualify alongside existing keys, with existing case-insensitive acquisition-name matching and raw key/value preservation

#### Scenario: An override remains authoritative
- **WHEN** an explicit acquisition array omits the click marker, including an empty array, with no other existing acquisition signal
- **THEN** marker presence alone MUST NOT replace Last Touch through a forced union with fallback keys

#### Scenario: Blank or key-only returns remain non-acquisition
- **WHEN** a later initial landing has only absent/empty/null/whitespace-only click context or standalone `m-message-key-id` and no other existing acquisition signal
- **THEN** it MUST NOT gain Last Touch eligibility from this extension, and retained allowed raw values MUST NOT be globally trimmed or rewritten
- **AND** first capture without unexpired First Touch MUST retain its existing initialization behavior

### Requirement: Maestra capture retains existing raw and cart-event lifecycle contracts
Maestra click context SHALL use existing client-only initial capture, sensitive filtering, origin/path-only landing URL, touch expiry/identity and queued cart-event reporting. No route-wide or SSR capture, immediate report trigger, synthetic channel/source/platform, provider call or new transport/state machinery SHALL be introduced.

#### Scenario: A real cart event reports the captured touch
- **WHEN** an eligible click-marker Last Touch is unsent and an existing cart-created/cart-connected event requests reporting
- **THEN** the existing queued `{ "request": <raw touch> }` body MUST retain allowed click/UTM context, submit unsent First Touch first, and mark each touch sent only after success
- **AND** Magento MUST remain the only classifier, with the existing API forwarding and nonblocking failure/in-flight/duplicate behavior unchanged

#### Scenario: Authentication and recovery stay independent
- **WHEN** current-browser authentication or synthetic cart recovery consumes its existing route/input alongside click tracking
- **THEN** those inputs and ownership checks MUST remain unchanged, marker values MUST NOT authorize access, and existing credential exclusions MUST NOT be weakened as required raw attribution

#### Scenario: Internal navigation does not add capture
- **WHEN** the marker appears only after initial SPA synchronization or the module runs during SSR
- **THEN** this extension MUST NOT add route-change collection, immediate reporting or SSR touch creation
