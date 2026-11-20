# Spec Delta

## Purpose

Present each Order History item's API-provided holiday delivery promise instead of its visible shipment estimate, with explicit per-brand opt-in and unchanged shipment visibility and actions.

## ADDED Requirements

### Requirement: Holiday promise presentation is an explicit per-brand option

The storefront SHALL enable holiday promise presentation only when `orderHistory.displayHolidayPromise` is the boolean `true`. A false or absent option SHALL retain existing Order History shipment presentation. The generated local configuration SHALL obtain this boolean from `ORDER_HISTORY_DISPLAY_HOLIDAY_PROMISE`; repository-provided local defaults and CI SHALL set it to `false`.

#### Scenario: Brand opts in
- **WHEN** a storefront has `orderHistory.displayHolidayPromise` set to boolean `true`
- **THEN** its Order History uses holiday promise presentation for items satisfying the item and visibility requirements

#### Scenario: Option is off or absent
- **WHEN** a storefront has the option set to `false` or does not define it
- **THEN** holiday-linked and nonholiday items retain the existing shipment presentation, including localized estimated dates wherever currently visible

#### Scenario: Repository-managed defaults are used
- **WHEN** a developer uses the example environment and default Compose configuration, or CI generates the runtime configuration
- **THEN** `ORDER_HISTORY_DISPLAY_HOLIDAY_PROMISE` supplies boolean `false` to the local configuration template

### Requirement: Each item uses only its own API holiday name

With the option enabled, an item in the Order History list whose own `extension_attributes.shipping_holiday_name` is a non-empty string SHALL display `In time for {holidayName}` in place of the entire estimated-shipment-date line, including its label and formatted date, wherever that line would otherwise be visible. The storefront SHALL NOT derive holiday eligibility from estimate dates, current date, sales mode, another item, or a hardcoded holiday mapping.

#### Scenario: Christmas item replaces the whole estimate line
- **WHEN** an item's estimate line would be visible, the option is enabled, and the item supplies `shipping_holiday_name: "Christmas"`
- **THEN** the item displays `In time for Christmas`
- **AND** neither the estimated-date label nor its formatted estimated date is displayed

#### Scenario: Mixed order keeps messages independent
- **WHEN** an order contains visible estimates for one item named `Christmas`, one named `Valentine's Day`, and one with no holiday name, with the option enabled
- **THEN** the items display `In time for Christmas`, `In time for Valentine's Day`, and the existing localized estimate respectively
- **AND** each item's message uses only its own shipping information

#### Scenario: Holiday has passed while the item is still unshipped
- **WHEN** the holiday date has passed, the option is enabled, and a still-unshipped item has an otherwise visible estimate and an API-supplied holiday name
- **THEN** the item continues to display `In time for {holidayName}` with that supplied name
- **AND** the storefront does not hide or replace the promise based on today's date or current holiday sales mode

### Requirement: Items without a holiday name keep their localized estimate

An item with no holiday name, including an absent extension-attributes object, missing holiday attribute, or empty holiday-name string, SHALL retain the existing translated `Est. shipment date` label and existing locale-formatted estimated date wherever the estimate line is visible. An estimated date alone SHALL NOT create a holiday promise.

#### Scenario: Ordinary item has no holiday attribute
- **WHEN** the option is enabled and a visible-estimate item has no holiday attribute, whether or not other extension attributes exist
- **THEN** the item displays its existing localized estimate and no holiday promise

#### Scenario: Empty holiday name
- **WHEN** the option is enabled and a visible-estimate item supplies an empty holiday-name string
- **THEN** the item displays its existing localized estimate rather than an incomplete `In time for ` message

### Requirement: Holiday presentation preserves shipment visibility and actions

The holiday name SHALL NOT make a hidden Shipment information section or hidden estimate line visible. Existing progress-tracker visibility, blocking actions, shipment-section visibility, actual shipment-date precedence, and tracking presentation SHALL remain unchanged. Holiday presentation SHALL NOT change available actions or their behavior.

#### Scenario: No estimate or shipments
- **WHEN** a holiday-linked item has neither an estimate nor shipments
- **THEN** its Shipment information section remains hidden even with the option enabled

#### Scenario: Progress visibility blocks shipment information
- **WHEN** an item's Shipment information section is hidden by the existing progress-tracker rules, including a blocking available action
- **THEN** the section remains hidden even when a holiday name and estimate are present and the option is enabled
- **AND** its existing actions remain available under their existing rules

#### Scenario: Actual shipment date takes precedence
- **WHEN** a holiday-linked item has an actual shipment date and tracking information, with the option enabled
- **THEN** its actual shipment date and tracking remain visible as before
- **AND** neither a holiday promise nor an estimated shipment date is displayed

#### Scenario: Tracking exists without a shipment date
- **WHEN** the option is enabled and a holiday-linked item has tracking records without an actual shipment date and an otherwise visible estimate
- **THEN** the holiday promise replaces that estimate line
- **AND** the tracking records remain visible as before

### Requirement: Holiday wording is localized without altering the API name

The storefront SHALL translate the complete `In time for {holidayName}` message with a named placeholder. The holiday name SHALL be inserted as supplied by the API, without translating, removing a year, or otherwise rewriting it. A different API-provided holiday name SHALL NOT require a new storefront message or code change.

#### Scenario: Localized message surrounds an unchanged name
- **WHEN** the current locale supplies a translation for `In time for {holidayName}` and the item supplies a holiday name
- **THEN** the translated message is rendered with that exact holiday name substituted into its named placeholder

#### Scenario: A later holiday is returned
- **WHEN** an otherwise eligible item supplies a non-Christmas holiday name
- **THEN** the same translated placeholder message displays that name without a holiday-specific frontend change
