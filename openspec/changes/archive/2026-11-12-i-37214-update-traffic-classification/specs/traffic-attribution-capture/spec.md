# Spec Delta

## Purpose

Preserve raw browser acquisition context for Magento attribution while retaining the storefront's existing First Touch, Last Touch, filtering, and cart-lifecycle reporting contracts.

## ADDED Requirements

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
