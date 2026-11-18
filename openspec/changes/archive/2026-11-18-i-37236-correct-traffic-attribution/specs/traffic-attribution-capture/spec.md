# Spec Delta

## MODIFIED Requirements

### Requirement: AppLovin identifiers qualify initial acquisition landings
The storefront SHALL recognize `aleid` and `alart` as coarse acquisition-key signals on initial client-side SPA landings under the existing configured-key gate, without requiring UTM source/medium or an external referrer and without classifying the traffic itself. Eligible captures SHALL use the shared Last Touch replacement policy.

#### Scenario: Either identifier replaces Last Touch without UTMs
- **WHEN** an unexpired First Touch exists and a different initial browser landing contains `aleid`, `alart`, or both after existing raw query normalization/filtering, with no UTM source/medium or usable external referrer, and those keys are in the effective acquisition list
- **THEN** the captured raw touch MUST qualify for the Last Touch replacement policy while the unexpired First Touch remains unchanged

#### Scenario: Acquisition key names retain case-insensitive matching
- **WHEN** a captured AppLovin identifier key differs in case from its configured acquisition-key name
- **THEN** it MUST qualify under the same existing case-insensitive gate while the raw payload preserves its submitted key/value according to existing route normalization

#### Scenario: First capture and non-acquisition landings retain their lifecycle
- **WHEN** there is no unexpired First Touch, or a later initial landing has only empty/null AppLovin values removed by existing normalization and no other acquisition signal
- **THEN** the first-capture case MUST continue initializing both touches from the same raw payload, and the later non-acquisition case MUST leave the existing touches unchanged

### Requirement: AppLovin Last Touch uses existing reporting semantics
AppLovin touches SHALL use the shared per-cart delivery requirements and existing client-only storage and cart-lifecycle flow. Magento SHALL remain responsible for classification. No new capture or reporting trigger SHALL be introduced.

#### Scenario: A new AppLovin Last Touch is reported through the existing cart event
- **WHEN** a captured different AppLovin Last Touch is pending for the current cart and an existing cart-created or cart-connected event requests reporting
- **THEN** it MUST use the shared ordered delivery contract and unchanged raw-touch body
- **AND** Magento MUST remain responsible for classification of the received raw context

#### Scenario: Existing duplicate and failure handling remains applicable
- **WHEN** an AppLovin touch duplicates First Touch, same-cart reporting is already in flight, or a submission fails
- **THEN** the shared duplicate, coalescing and retry rules MUST apply without blocking cart/checkout or adding a retry trigger

#### Scenario: Internal route navigation does not become acquisition capture
- **WHEN** AppLovin query parameters appear only after initial SPA synchronization, or the module executes during SSR
- **THEN** this extension MUST NOT introduce route-change capture, immediate reporting, SSR touch capture, or a replacement for the client-only lifecycle

### Requirement: Documented Maestra clicks qualify initial acquisition under existing defaults
Both shipped and fallback acquisition lists SHALL include `m-message-click-id`. A nonblank normalized click value SHALL qualify a different initial client landing through the existing gate when the effective list permits it, subject to the shared Last Touch replacement policy. Explicit configured arrays SHALL retain replacement authority; standalone key markers or inferred aliases SHALL NOT gain eligibility from this extension.

#### Scenario: Retained First Touch and a click-only return
- **WHEN** an unexpired Google First Touch exists and a different initial return landing contains only a nonblank documented click marker under the effective acquisition list
- **THEN** First Touch and its metadata MUST remain unchanged and the capture MUST qualify for the shared Last Touch replacement policy without fabricated UTMs or client classification

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
Maestra click context SHALL use existing client-only initial capture, sensitive filtering, origin/path-only landing URL, touch expiry/identity and queued cart-event reporting, governed by the shared replacement and per-cart delivery requirements. Credential protection from #37235 SHALL remain unchanged. No route-wide or SSR capture, immediate report trigger, synthetic channel/source/platform, provider call or alternate transport SHALL be introduced.

#### Scenario: A real cart event reports the captured touch
- **WHEN** an eligible click-marker Last Touch is pending for the current cart and an existing cart-created/cart-connected event requests reporting
- **THEN** the shared ordered delivery contract MUST apply to the allowed raw click/UTM context
- **AND** Magento MUST remain the only classifier, with existing API forwarding and nonblocking event handling

#### Scenario: Authentication and recovery stay independent
- **WHEN** current-browser authentication or synthetic cart recovery consumes its existing route/input alongside click tracking
- **THEN** those inputs and ownership checks MUST remain unchanged and marker values MUST NOT authorize access

#### Scenario: Internal navigation does not add capture
- **WHEN** the marker appears only after initial SPA synchronization or the module runs during SSR
- **THEN** this extension MUST NOT add route-change collection, immediate reporting or SSR touch creation

### Requirement: Ordinary stored-touch reuse is outside recleaning scope
State, storage and reporting SHALL consume supplied attribution values without repeated filtering. Previously stored touches SHALL retain selected entries and URL carriers when loaded, synchronized across tabs, persisted or reported, subject to ordinary expiry and the shared storage ordering rule. Wrapper delivery metadata SHALL follow the per-cart persistence requirement; touch identity and expiry SHALL remain unchanged. No attribution purge, version marker or custom storage protocol SHALL be introduced.

#### Scenario: Stored touches are restored or synchronized across tabs
- **WHEN** ordinary synchronization or an accepted cross-tab event loads an old saved touch containing either selected name
- **THEN** its attribution values MUST pass through unchanged without a sanitized working clone or attribution rewrite

#### Scenario: A cart event reports an old saved touch
- **WHEN** an existing cart event reports an old touch eligible under the shared delivery requirements
- **THEN** its browser-side body MUST retain the unchanged saved attribution values
- **AND** normal Magento HTTP intake MUST independently filter the received fresh request, without client-side saved-touch cleanup
- **AND** the existing TaskQueue execution task-object/body diagnostic MUST retain the old-value exemption without new logging or suppression

## ADDED Requirements

### Requirement: Touch delivery is ordered and specific to each cart
Each cart SHALL receive available First Touch followed by a distinct available Last Touch. A successful delivery SHALL suppress unchanged repeat delivery while the touch's delivered cart id matches that cart. Last Touch SHALL be sent only after First Touch has been delivered to that cart. After a successful First Touch mark, the reporting action SHALL clear the current Last Touch's matching delivered cart id through the existing Last Touch set path, making its distinct Last Touch eligible for ordered restoration. The mark itself SHALL change only First Touch. Failures SHALL remain retryable on later cart reporting without blocking checkout or repeating successful work unnecessarily.

#### Scenario: A replacement cart receives retained attribution
- **WHEN** cart A received a touch and cart B is created or connected with unchanged stored touches
- **THEN** B MUST receive the retained attribution independently of A's success

#### Scenario: Returning to an earlier cart resends attribution
- **WHEN** retained touches are successfully delivered to cart A, then B, and cart A reports again
- **THEN** A MUST receive First Touch followed by its distinct Last Touch again, without creating duplicate Magento rows and with its last row restored

#### Scenario: A new cart receives distinct first and last touches
- **WHEN** First Touch remains unchanged and a distinct Last Touch is available for a new cart
- **THEN** that cart MUST receive First Touch successfully before Last Touch is submitted

#### Scenario: Equivalent first and last touches use one request
- **WHEN** First and Last Touch have equivalent full raw payloads, independent of object-key order
- **THEN** reporting MUST suppress the duplicate Last Touch request

#### Scenario: Repeated reporting after success sends nothing
- **WHEN** reporting runs again for a cart whose unchanged required touches are recorded as delivered
- **THEN** no attribution request MUST be issued

#### Scenario: Last touch failure retries only last touch
- **WHEN** First Touch succeeds but Last Touch returns non-200 or rejects, and a later event reports the same cart
- **THEN** First Touch MUST remain delivered and only Last Touch MUST be retried

#### Scenario: First touch failure skips last touch
- **WHEN** First Touch returns non-200 or rejects before either touch is delivered to a cart
- **THEN** Last Touch MUST NOT be sent, neither touch MUST be marked delivered, and a later report MUST attempt First Touch then Last Touch after First Touch succeeds

#### Scenario: Resent first touch restores an already delivered last touch
- **WHEN** First Touch needs delivery to a cart but its distinct Last Touch already records that cart
- **THEN** after the successful First Touch mark, the reporting action MUST clear the current Last Touch's matching delivered cart id through the existing Last Touch set path, which persists the pending Last Touch and allows it to be sent in the same pass; the mark itself MUST change and persist only First Touch
- **AND** if restoration fails, Last Touch MUST remain pending for a later report without repeating the successful First Touch

### Requirement: Delivery metadata survives storage without entering attribution
Each touch SHALL store only its latest successfully delivered cart as optional wrapper metadata `deliveredCartId`, outside attribution, replacing the global sent flag. Successful delivery marks SHALL carry `{ createdAt, cartId }` and set the id only on the matching current touch; a missing or replaced target SHALL be a no-op. Normal SET intake SHALL drop `isSent` and retain `deliveredCartId` only if it is a non-empty string, otherwise leaving it absent, without migration or attribution rewriting.

#### Scenario: Reload preserves cart-specific delivery
- **WHEN** touches delivered to cart A are persisted and restored in a new document
- **THEN** A MUST remain suppressed and a different cart B MUST still receive the available touches

#### Scenario: Legacy sent touches are delivered once in order
- **WHEN** distinct stored First and Last Touch have `isSent: true` with no delivered cart id and the current cart reports
- **THEN** they MUST be treated as delivered to no cart and sent First then Last
- **AND** after success and reload, another report to that cart MUST send neither again

#### Scenario: A stored touch has neither delivery field
- **WHEN** a stored touch has neither `isSent` nor `deliveredCartId`
- **THEN** it MUST retain an absent delivered cart id and be eligible for the current cart

#### Scenario: Stored delivery metadata is normalized
- **WHEN** SET intake receives `isSent` true or false, with a valid non-empty string id or an invalid empty/non-string id
- **THEN** it MUST drop the boolean and retain only a valid delivered cart id, leaving invalid ids absent without changing attribution or timestamps

#### Scenario: An in-flight touch is replaced
- **WHEN** a request completes after its target First or Last Touch was replaced with a different `createdAt` or cleared
- **THEN** its completion MUST NOT alter the replacement touch's delivery state
- **AND** an obsolete First Touch mark MUST NOT alter current Last Touch delivery metadata
- **AND** if the sent First Touch is no longer current by `createdAt` after its response is handled, the pass MUST stop without further sends or marks from the stale snapshot; the next cart event MUST report the current touches

### Requirement: Request cart and recorded cart remain identical
Reporting SHALL use the active store cart id at pass start and re-read it immediately before each one-argument TaskQueue request without an intervening await. A mismatch at that pre-request read SHALL stop the pass before the next send or mark. A successful response SHALL be recorded for the pass cart, subject to touch identity, even if the active cart changed while that request was pending; earlier and current marks SHALL remain. The existing POST body SHALL remain exactly `{ "request": <attribution> }`, without cart ids or `deliveredCartId` metadata.

#### Scenario: No cart or no first touch is available
- **WHEN** reporting has an empty current cart id or no First Touch
- **THEN** it MUST send nothing and mark nothing

#### Scenario: Transport uses the recorded cart
- **WHEN** the pre-request cart matches the pass cart and the request succeeds
- **THEN** the cart read synchronously by the TaskQueue facade MUST equal the cart recorded for that touch
- **AND** TaskQueue MUST receive only its existing task argument

#### Scenario: Request body contains attribution alone
- **WHEN** reporting a touch whose wrapper contains a delivered cart id
- **THEN** the serialized body MUST contain exactly the raw attribution under `request` and MUST contain neither the current cart id nor `deliveredCartId` metadata

#### Scenario: Cart changes between requests
- **WHEN** a pass for cart A detects cart B before its next request
- **THEN** A's pass MUST stop with no further sends or marks, and B's own cart event MUST report B independently

#### Scenario: Cart changes while a request is pending
- **WHEN** a successful request issued for cart A completes after the active cart became B
- **THEN** the response MUST be recorded for A subject to touch identity, keeping earlier and current marks
- **AND** the next pre-request read MUST stop the pass before sending Last Touch to B

### Requirement: In-flight reports coalesce per cart
Reporting SHALL coalesce simultaneous reports for the same cart into that cart's in-flight work and SHALL allow a different cart's event to start independent work. Settling a pass SHALL release only its own cart's entry, on success or failure.

#### Scenario: Same cart reports concurrently
- **WHEN** a second report for cart A arrives while A's pass is pending
- **THEN** it MUST join that work without another request sequence

#### Scenario: Different cart reports concurrently
- **WHEN** cart B reports while A's request is pending
- **THEN** B's pass MUST start rather than join A, and A settling MUST NOT release B's coalescing entry

#### Scenario: A failed pass releases its entry
- **WHEN** a pass fails and a later event reports that cart
- **THEN** new reporting MUST be allowed under the ordered retry rules

### Requirement: Last Touch replacement ignores duplicates and respects a fixed cooldown
With an existing unexpired First Touch, only initial captures with an acquisition signal SHALL qualify to replace Last Touch. A capture identical to Last Touch across all attribution fields except `detected_at` SHALL be ignored, independent of key order or cooldown. A different eligible capture SHALL be suppressed only when its existing Last Touch age is nonnegative and strictly less than the positive finite configured `trafficAttribution.lastTouchReplacementCooldownSeconds` interval. The shipped value SHALL be `30`; absent, zero, negative or non-numeric values SHALL disable cooldown. Suppression SHALL drop the capture without deferral or changes to retained touch timestamps, expiry or delivery state, and SHALL NOT inhibit reporting retained touches.

#### Scenario: Cooldown minus one millisecond suppresses replacement
- **WHEN** a different acquisition capture arrives at age N seconds minus 1 ms with a positive N-second cooldown
- **THEN** Last Touch MUST remain unchanged

#### Scenario: Exactly the cooldown accepts replacement
- **WHEN** a different acquisition capture arrives at age exactly N seconds
- **THEN** it MUST replace Last Touch with a new touch pending delivery

#### Scenario: Cooldown plus one millisecond accepts replacement
- **WHEN** a different acquisition capture arrives at age N seconds plus 1 ms
- **THEN** it MUST replace Last Touch with a new touch pending delivery

#### Scenario: Disabled cooldown preserves immediate distinct replacement
- **WHEN** the setting is absent, `0`, negative or non-numeric and an otherwise eligible distinct acquisition arrives
- **THEN** cooldown MUST NOT suppress that replacement

#### Scenario: Negative elapsed time is outside cooldown
- **WHEN** a different eligible capture has a negative elapsed time relative to stored Last Touch
- **THEN** cooldown MUST NOT suppress that replacement

#### Scenario: Suppression does not extend the window
- **WHEN** captures are suppressed before the original Last Touch reaches N seconds and a distinct eligible capture arrives at that original boundary
- **THEN** it MUST be accepted without any delayed replay of suppressed captures

#### Scenario: Identical parameters do not create a new touch
- **WHEN** a reload changes only `detected_at`, including reordered query keys, either inside or outside cooldown or with cooldown disabled
- **THEN** the stored Last Touch and its timestamps, expiry and delivery state MUST remain unchanged

#### Scenario: A genuine later paid visit replaces last touch
- **WHEN** a distinct paid acquisition such as a new `gclid` arrives outside cooldown
- **THEN** Last Touch MUST become that raw capture while First Touch and its metadata remain unchanged

#### Scenario: A genuine later organic visit replaces last touch
- **WHEN** a distinct organic acquisition such as a new `srsltid` or usable search referrer arrives outside cooldown
- **THEN** Last Touch MUST become that raw capture while First Touch and its metadata remain unchanged

#### Scenario: Rapid paid and organic captures are suppressed
- **WHEN** distinct paid or organic initial-page acquisitions arrive inside cooldown
- **THEN** neither retained touch MUST change, including First Touch and its metadata

#### Scenario: Missing last touch is captured with cooldown enabled
- **WHEN** an acquisition capture has an existing First Touch but no Last Touch and cooldown is enabled
- **THEN** cooldown MUST NOT prevent capturing Last Touch and First Touch MUST remain unchanged

#### Scenario: Capture suppression does not block a new cart
- **WHEN** duplicate or cooldown suppression retains stored attribution and a new cart event requests reporting
- **THEN** that cart MUST still receive the retained touches under the ordered delivery contract

### Requirement: Storage events cannot replace a touch with an older touch
A storage-event import SHALL be ignored if its `createdAt` is strictly older than the corresponding current First or Last Touch. Equal-age and newer updates, updates without a current touch, and storage removals SHALL retain existing synchronization behavior, with delivery metadata normalized under the shared persistence requirement.

#### Scenario: A delayed older touch arrives from another tab
- **WHEN** an older First or Last Touch event arrives after newer state, including a delayed paid or organic touch
- **THEN** current attribution, timestamps, expiry and delivery state MUST remain unchanged

#### Scenario: Equal-age delivery metadata propagates
- **WHEN** a storage event has the same `createdAt` as the current touch and updated delivery metadata
- **THEN** the update MUST be accepted rather than rejected as an older touch

#### Scenario: Newer values and removals retain synchronization
- **WHEN** an event supplies a newer touch, supplies a touch when none exists, or removes the stored touch
- **THEN** it MUST update or clear the corresponding state through the existing synchronization path
