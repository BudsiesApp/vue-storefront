# Spec Delta

## MODIFIED Requirements

### Requirement: Standard is the initial production-time selection

The storefront SHALL select Standard when a production-time customization has no selected value. In Holiday mode, it MUST defer defaulting and reconciliation until browser location and applicable saved customization restoration are ready. It SHALL retain any selected value valid and visible for the resolved mode/location, and select Standard only when the ready selection is empty or invalid. Loading SHALL NOT clear or replace an existing selection.

#### Scenario: New product configuration has no production-time value
- **WHEN** the production-time customization is available and its selection is empty, with browser location and saved customization restoration complete for Holiday mode
- **THEN** the storefront selects the Standard option

#### Scenario: Existing upgrade selection is restored
- **WHEN** a product is loaded with a Rush or Super Rush value that is valid and visible in the resolved current mode and location
- **THEN** the storefront retains that selected option

#### Scenario: Location change invalidates the selected upgrade
- **WHEN** a customer changes the ready Holiday location and the selected upgrade does not apply to the new location
- **THEN** the storefront selects the Standard option for the new location

#### Scenario: Holiday data is not ready
- **WHEN** SSR, initial hydration, persisted shipping-country loading or applicable saved-form restoration is in progress
- **THEN** the Holiday widget does not default, clear, overwrite or persist a replacement for an existing production-time selection
- **AND** a temporarily empty or incomplete visible-options list is not treated as evidence that the selection is invalid

#### Scenario: Shipping country and saved selection arrive in either order
- **WHEN** a valid saved Holiday Rush selection and its applicable persisted shipping country become available asynchronously in either order
- **THEN** the storefront waits for both readiness boundaries and retains that Rush selection without an intervening Standard replacement

#### Scenario: Location update preserves a shared valid Rush value
- **WHEN** the ready Holiday location changes and the selected Rush value is valid for both locations, including records sharing the same underlying SKU
- **THEN** the selected value remains unchanged while its displayed terms update to the new location

#### Scenario: Unreadable saved data preserves a valid current selection
- **WHEN** saved customer or applicable saved-form data cannot be read and the current production-time selection remains valid for the resolved fallback location
- **THEN** the storefront retains that selection without an intervening Standard replacement
- **AND** failed reads do not keep selection reconciliation pending indefinitely

### Requirement: Holiday delivery location is resolved and selectable

The Holiday widget SHALL remain neutral during SSR/initial hydration. Once the browser shipping-country attempt settles, it SHALL use persisted country when available, otherwise detected country then US, using nonblank sources. Unreadable saved data SHALL resolve via detected country/US rather than indefinite loading. Unrelated customer-data reads SHALL NOT delay resolution. The widget SHALL allow manual location changes and retain them over later automatic updates.

#### Scenario: Previously selected shipping country exists
- **WHEN** browser shipping-data loading completes and a previously selected shipping country is available
- **THEN** the widget derives its initial US or international location from that country without consulting lower-priority sources

#### Scenario: Only detected country exists
- **WHEN** browser shipping-data loading completes without a nonblank previously selected shipping country and the detected-country cookie contains a country
- **THEN** the widget derives its initial location from the detected country

#### Scenario: No customer country data exists
- **WHEN** browser shipping-data loading completes and neither a nonblank previously selected shipping country nor a detected country is available
- **THEN** the widget initializes its location as US

#### Scenario: Customer changes delivery location
- **WHEN** the customer changes the ready widget location between US and international
- **THEN** the visible Holiday options update to the selected location
- **AND** later persisted-country changes do not overwrite that manual choice

#### Scenario: Pending shipping data is distinct from absent shipping data
- **WHEN** the browser has mounted but its persisted shipping-country read has not completed
- **THEN** the widget remains neutral instead of briefly choosing the detected country or US fallback
- **AND** loading ends when that read succeeds, is absent, fails or reaches the existing storage fallback

#### Scenario: Saved country cannot be read
- **WHEN** the browser shipping-country attempt fails or reaches the existing storage fallback without a usable saved country
- **THEN** the widget resolves from a nonblank detected country or US when that is absent/blank, instead of remaining in loading
- **AND** applicable labels/options and the manual location control become available without clearing a valid current selection once any required draft removal has settled

#### Scenario: Unrelated saved customer fields do not block location
- **WHEN** the shipping-country attempt has settled but an email, name, phone, VAT or legacy-email read is still pending or has failed
- **THEN** Holiday location resolves from the available country sources without waiting for those unrelated fields

#### Scenario: Late saved-country completion follows fallback
- **WHEN** fallback has completed and an earlier storage attempt returns a late result after the customer changes location manually
- **THEN** that result does not replace the resolved manual location or reset a valid selection

### Requirement: Holiday options are filtered by location and phase

In Holiday Period mode, the storefront SHALL remove production-time records without available slots while preparing the customization, then display only records whose `isDomestic` value matches the ready browser location. Before location readiness, it SHALL show neutral loading instead of country-dependent options. Once ready, the resulting options MUST retain existing turnaround ordering and remain usable on desktop and mobile.

#### Scenario: Standard meets the selected location cutoff
- **WHEN** the location is ready and the API supplies an available Standard record with `is_in_time_for_christmas: true` and no Holiday Rush record for that location
- **THEN** the widget displays only the Standard option with that promise

#### Scenario: Only Holiday Rush meets the selected location cutoff
- **WHEN** the location is ready and the API supplies Standard with `is_in_time_for_christmas: false` and one available Holiday Rush record with `is_in_time_for_christmas: true` for that location
- **THEN** the widget displays Standard followed by that Holiday Rush option

#### Scenario: Holiday Rush is closed
- **WHEN** the location is ready and the API supplies Standard with `is_in_time_for_christmas: false` and no available Holiday Rush record for that location
- **THEN** the widget displays only the Standard option

#### Scenario: Other-location records are returned
- **WHEN** the location is ready and the API response also contains records for the other location
- **THEN** none of those records is displayed in the Holiday Period widget

#### Scenario: Location variants share a Rush SKU
- **WHEN** the location is ready and domestic and international Holiday Rush records share a SKU
- **THEN** the widget displays the text and terms from the selected location's record while retaining the shared underlying option-value ID

## ADDED Requirements

### Requirement: Ambiguous saved draft absence permits normal persistence

When a saved-draft result cannot distinguish an unreadable draft from absence, the storefront SHALL treat it as absent and allow normal persistence after readiness. It SHALL NOT add driver or read-status metadata checks to distinguish those cases. Normal saving is permitted even if it overwrites an unreadable draft; pending-read guards and valid current selection protection SHALL remain in effect.

#### Scenario: Ambiguous empty result follows ordinary absent-draft behavior
- **WHEN** draft restoration settles with a result indistinguishable from an absent draft
- **THEN** the storefront completes readiness and follows ordinary absent-draft defaulting and persistence
- **AND** ordinary saving is allowed despite the accepted risk of overwriting an unreadable draft, without a failure-specific write veto or new driver/metadata checks

#### Scenario: Valid current selection remains protected while saving is allowed
- **WHEN** draft restoration settles ambiguously as absent and the current production-time selection is valid for the ready location
- **THEN** the storefront retains that selection and allows its normal persistence
- **AND** it does not replace the valid selection with Standard merely because no saved draft was returned

### Requirement: Concurrent saved-data timeout callbacks are independent

Saved-data reads sharing a storage instance SHALL have independent timeout callbacks at the existing 800 ms duration. Each supplied callback SHALL receive the existing success/fallback result at most once; another read MUST NOT cancel or reset its timeout. The shared returned promise SHALL retain its existing contract, including remaining pending when backend work hangs; timeout SHALL NOT force its settlement.

#### Scenario: Two concurrent hanging reads keep their own deadlines
- **WHEN** two saved-data reads on the same storage instance start at different times and their backing readiness or reads never complete
- **THEN** each supplied callback independently receives the existing fallback at its own unchanged 800 ms deadline
- **AND** neither read cancels or resets the other's timeout
- **AND** returned promises retain the existing pending behavior rather than being forced to settle on timeout

#### Scenario: Completing one read leaves another timeout active
- **WHEN** concurrent reads share a storage instance and one returns successfully before the other hanging read's deadline
- **THEN** the successful read keeps its existing result and the hanging read's supplied callback still receives its fallback at its own unchanged deadline

#### Scenario: Backend completion after timeout cannot deliver a duplicate callback
- **WHEN** a backing read resolves or rejects after its callback has already received the timeout fallback
- **THEN** that callback is not invoked again and the returned promise retains its existing eventual success/error behavior

#### Scenario: Promise-only read does not cancel another read's callback
- **WHEN** a promise-only read starts while another read on the same storage instance is waiting for its timeout callback
- **THEN** the earlier callback still receives its existing fallback at its own unchanged deadline
- **AND** the promise-only read retains its existing contract without timeout-forced settlement

### Requirement: Late reads cannot restore cache invalidated by same-key mutation

A backend read started before a same-key write or removal SHALL NOT later repopulate local cache with its old result. Other keys and reads without intervening same-key mutation SHALL retain existing cache behavior. The guard SHALL preserve the original read's promise/callback contract and timeout duration and SHALL NOT add timers or draft-failure classification metadata.

#### Scenario: Timed-out read completes after removal
- **WHEN** a read times out, the same key is removed, the old backend read returns and the key is read again
- **THEN** the old result does not resurrect removed local data and the reread uses the post-removal state or existing fallback, not a cache entry restored by that old read
- **AND** the original read retains its existing returned-promise behavior

#### Scenario: Timed-out read completes after a new write
- **WHEN** a read times out, a new value is written to that key, the old backend read returns and the key is read again
- **THEN** the late result does not displace the new cached value, including an allowed falsy or memory-only value
- **AND** the reread retains existing value/fallback behavior without reviving the old cached result

#### Scenario: Unrelated mutation does not suppress ordinary cache fill
- **WHEN** a backend read completes with no intervening mutation of its key, including when a different key was written or removed
- **THEN** its ordinary cache-fill behavior and unrelated cached entries remain unchanged

### Requirement: Required draft removal stays ordered before readiness

Required draft removal SHALL stay ordered before restoration readiness and later draft saving, including after read fallback. Rejection SHALL be handled so the current flow can resume; a never-settling removal SHALL keep readiness/saving gated to prevent late deletion of new data. No timer or detached delete SHALL bypass that gate. Existing captured-key and stale-restoration guards SHALL remain.

#### Scenario: A pending delete cannot be overtaken by a new save
- **WHEN** restoration requires draft removal and that removal is still pending
- **THEN** restoration readiness and later saving remain gated rather than allowing new data to be saved ahead of the delete
- **AND** successful removal allows the current restoration flow to proceed in order

#### Scenario: Rejected draft removal releases the current flow
- **WHEN** a required draft removal rejects
- **THEN** the failure is handled, the existing operation lock is released and only the current restoration flow can resume readiness without clearing valid current selections

#### Scenario: Never-settling delete retains the accepted loading state
- **WHEN** a required draft removal never settles
- **THEN** the widget may remain loading and new saving remains gated to avoid a later delete removing newly saved data
- **AND** no timer, detached delete or early readiness release is introduced to force progress
