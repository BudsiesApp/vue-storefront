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
- **THEN** the storefront retains that selection without an intervening Standard replacement or a failure-triggered write over saved customization data
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
- **AND** applicable labels/options and the manual location control become available without clearing a valid current selection

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
