# Spec Delta

## ADDED Requirements

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
