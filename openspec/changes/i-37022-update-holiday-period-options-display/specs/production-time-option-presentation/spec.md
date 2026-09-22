# Spec Delta

## ADDED Requirements

### Requirement: Holiday Period mode is explicitly configured
The storefront SHALL use the Holiday Period presentation only when the Production Time widget is configured with the Holiday Period value. When that value is absent, the storefront MUST use the regular Production Time presentation.

#### Scenario: Holiday Period value is configured
- **WHEN** a Production Time widget is configured for Holiday Period mode
- **THEN** the widget uses the location-aware Holiday option presentation

#### Scenario: Holiday Period value is absent
- **WHEN** a Production Time widget has no Holiday Period configuration
- **THEN** the widget retains its regular duration-and-ship-date presentation

### Requirement: Holiday delivery location is resolved and selectable
The Holiday Period widget SHALL classify the delivery location as US or international. It SHALL initialize that location from the previously selected shipping country, then the detected-country cookie, then the configured default country, using the first available source. It SHALL display the selected location above the options and allow the customer to change it for the current product configuration.

#### Scenario: Previously selected shipping country exists
- **WHEN** a previously selected shipping country is available
- **THEN** the widget derives its initial US or international location from that country without consulting lower-priority sources

#### Scenario: Only detected country exists
- **WHEN** no previously selected shipping country is available and the detected-country cookie contains a country
- **THEN** the widget derives its initial location from the detected country

#### Scenario: No customer country data exists
- **WHEN** neither a previously selected shipping country nor a detected country is available
- **THEN** the widget derives its initial location from the configured default country

#### Scenario: Customer changes delivery location
- **WHEN** the customer changes the widget location between US and international
- **THEN** the visible Holiday options update to the selected location

### Requirement: Holiday options are filtered by location and phase
In Holiday Period mode, the storefront SHALL remove production-time records without available slots while preparing the customization, then display only records whose `isDomestic` value matches the selected US or international location. The resulting options MUST retain the existing turnaround ordering and remain usable on desktop and mobile.

#### Scenario: Standard meets the selected location cutoff
- **WHEN** the API supplies an available Standard record with `is_in_time_for_christmas: true` and no Holiday Rush record for the selected location
- **THEN** the widget displays only the Standard option with that promise

#### Scenario: Only Holiday Rush meets the selected location cutoff
- **WHEN** the API supplies Standard with `is_in_time_for_christmas: false` and one available Holiday Rush record with `is_in_time_for_christmas: true` for the selected location
- **THEN** the widget displays Standard followed by that Holiday Rush option

#### Scenario: Holiday Rush is closed
- **WHEN** the API supplies Standard with `is_in_time_for_christmas: false` and no available Holiday Rush record exists for the selected location
- **THEN** the widget displays only the Standard option

#### Scenario: Other-location records are returned
- **WHEN** the API response also contains records for the other location
- **THEN** none of those records is displayed in the Holiday Period widget

### Requirement: Cart items use the Magento shipment promise
The cart SHALL continue to render the `shipment_promise_template` supplied for each cart item without constructing a Holiday promise on the client.

#### Scenario: Checkout refreshes an item promise for the shipping country
- **WHEN** Magento returns a recalculated `shipment_promise_template` after the checkout shipping country is submitted
- **THEN** the cart item displays that returned template

## MODIFIED Requirements

### Requirement: Standard is the initial production-time selection
The storefront SHALL select the Standard production-time option when a production-time customization has no selected value. It MUST retain an existing selected value only while that value remains valid and visible for the current Production Time mode and selected Holiday location. If a location change makes the selection invalid, the storefront SHALL select Standard.

#### Scenario: New product configuration has no production-time value
- **WHEN** the production-time customization is available and its selection is empty
- **THEN** the storefront selects the Standard option

#### Scenario: Existing upgrade selection is restored
- **WHEN** a product is loaded with a Rush or Super Rush value that is valid and visible in the current mode
- **THEN** the storefront retains that selected option

#### Scenario: Location change invalidates the selected upgrade
- **WHEN** a customer changes the Holiday location and the selected upgrade does not apply to the new location
- **THEN** the storefront selects the Standard option for the new location

### Requirement: Production-time upgrades use reverse turnaround order in every layout
Outside Holiday Period mode, the production-time widget SHALL display available named options by configured turnaround time from longest to shortest, producing Standard, Rush, and Super Rush when all are available. In Holiday Period mode, it SHALL display Standard first and the applicable Holiday Rush second when both are available. Both modes MUST render correctly when fewer options are available.

#### Scenario: All three production-time options are available
- **WHEN** Standard, Rush, and Super Rush are available outside Holiday Period mode
- **THEN** the widget displays them from longest to shortest turnaround as Standard, Rush, and Super Rush in every layout

#### Scenario: Super Rush is unavailable for the product
- **WHEN** only Standard and Rush are available outside Holiday Period mode
- **THEN** the widget displays both options without an empty Super Rush position

#### Scenario: Two Holiday options are available
- **WHEN** Standard and one Holiday Rush option apply to the selected location
- **THEN** the widget displays Standard followed by Holiday Rush in every layout

### Requirement: Production-time cards use duration-first shipping information
Outside Holiday Period mode, each displayed card SHALL show a bold first line containing the duration followed by the option name and a muted second line containing its calculated ship date. In Holiday Period mode, each card SHALL display “In time for Christmas” when the API-provided `is_in_time_for_christmas` is true and “After Christmas” otherwise, without a duration, calculated ship date, or Domestic or International label.

#### Scenario: Configured turnaround time is presented
- **WHEN** an available option has a configured turnaround time outside Holiday Period mode
- **THEN** its card displays that duration before the option name and the corresponding target ship date below it

#### Scenario: Configured turnaround time changes
- **WHEN** an option's configured turnaround time changes outside Holiday Period mode
- **THEN** the card reflects the updated duration and target ship date without relying on a hard-coded value

#### Scenario: Holiday promise is presented
- **WHEN** an option is displayed in Holiday Period mode
- **THEN** its card displays the promise determined by the API-provided `is_in_time_for_christmas` value and no duration, calculated ship date, or location qualifier

### Requirement: Existing production-time commercial and availability behavior is retained
The storefront SHALL preserve production-time prices and submit the selected underlying option value unchanged. Outside Holiday Period mode, it SHALL preserve existing slot counts, sold-out disabling, fastest-available indication, selection interaction, and reverse-turnaround ordering. In Holiday Period mode, it SHALL hide unavailable options and show an available Holiday Rush count as “Only {count} holiday slots left”; Standard SHALL not display a slot-count message.

#### Scenario: A production-time upgrade is sold out
- **WHEN** an option has no remaining slots outside Holiday Period mode
- **THEN** it remains visibly sold out and cannot be selected

#### Scenario: A Holiday option is unavailable
- **WHEN** a Holiday Period option is unavailable for the selected location
- **THEN** it is not displayed

#### Scenario: Holiday Rush has customer-facing slots
- **WHEN** an available Holiday Rush option has a customer-facing slot count
- **THEN** its card displays “Only {count} holiday slots left” with the returned count

#### Scenario: Customer selects a production-time upgrade
- **WHEN** the customer selects an available Rush option
- **THEN** its existing price and underlying checkout value are retained

#### Scenario: Production-time widget is rendered responsively
- **WHEN** the widget is displayed in a responsive layout
- **THEN** it retains the ordering required by its mode and usable selection controls
