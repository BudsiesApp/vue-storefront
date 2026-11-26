# order-success-birthday-sharing Specification

## Purpose

Let customers share valid pet birthdays after placing an order, carrying the order attributes needed by the backend to verify the request.

## Requirements

### Requirement: Birthday day choices follow the selected month
The order-success birthday form SHALL offer days 1–30 for April, June, September, and November; 1–29 for February; and 1–31 for the other months. Whenever no month is selected, including after selecting the `MM` placeholder again, it SHALL offer days 1–31. The existing empty day placeholder SHALL remain available.

#### Scenario: No month selected
- **WHEN** the customer opens the birthday form without selecting a month or selects the `MM` placeholder after choosing a month
- **THEN** the day choices contain the empty placeholder followed by days 1–31

#### Scenario: Customer selects a month
- **WHEN** the customer selects any month
- **THEN** the available day choices contain the empty placeholder and exactly the days defined for that month
- **AND** February offers 29 regardless of the current year

#### Scenario: Customer changes from a longer month to a shorter month
- **WHEN** the customer changes January to April or February
- **THEN** days outside the new month's range are no longer selectable by pointer or keyboard

### Requirement: Month changes preserve only valid selected days
When the month changes, the form SHALL clear a chosen day if it exceeds the new month's maximum, show the existing day-required error, and prevent submission until a day is chosen. A day that exists in the new month SHALL remain selected.

#### Scenario: Selected day no longer exists
- **GIVEN** the customer has entered a name and selected January 31
- **WHEN** the customer changes the month to April
- **THEN** the selected day is cleared and the existing required error is displayed
- **AND** activating Submit does not send a birthday request

#### Scenario: Selected day remains valid
- **GIVEN** the customer has selected January 29
- **WHEN** the customer changes the month to February
- **THEN** day 29 stays selected

### Requirement: Birthday requests carry the displayed order's attributes
Each valid birthday submission SHALL send the name, numeric month and day, numeric order entity ID as `orderId`, and the order email as `email` to the existing `POST /budsies/share/artists` route. The entity ID SHALL come from the success page's confirmation and SHALL NOT be replaced with the displayed order number. The email SHALL come from the order displayed on that page, not mutable checkout state.

#### Scenario: Valid birthday submitted
- **GIVEN** a successful order confirmation and its order are displayed
- **WHEN** the customer submits a valid name, month, and day
- **THEN** the request body contains `name`, `birthMonth`, `birthDay`, `orderId`, and `email`
- **AND** `orderId` equals the confirmation's Magento order entity ID
- **AND** `email` equals the displayed order's email even if checkout state has a different email

#### Scenario: Order number is unavailable
- **GIVEN** the successful confirmation contains an order entity ID but its displayed order number is null
- **WHEN** the customer submits a valid birthday
- **THEN** the request still carries the order entity ID as `orderId`

### Requirement: Birthday submission retains existing feedback and repeat-entry behavior
The form SHALL retain its existing labels and desktop layout, place the full-width name above equal-width month and day fields on mobile, present select validation errors consistently with the name and address fields, disable its inputs and Submit while a request is pending, show its existing thank-you state on success, and allow another pet to be entered with the same order attributes. A failed request SHALL show the existing `Something went wrong` notification, keep the form and entered values, and re-enable the controls.

#### Scenario: Request is pending
- **WHEN** a birthday request is pending
- **THEN** the name, month, day, and Submit controls are disabled
- **AND** another activation does not start a second birthday request

#### Scenario: Birthday accepted and another pet added
- **WHEN** the backend accepts a birthday request
- **THEN** the existing thank-you state is shown and the editable name, month, and day are cleared
- **AND** activating Add another shows the empty form with days 1–31
- **AND** the next valid submission uses the same order entity ID and order email

#### Scenario: Backend rejects the request
- **WHEN** the birthday request fails, including an order-verification rejection
- **THEN** the existing `Something went wrong` notification is shown
- **AND** the entered form remains visible with its controls re-enabled
- **AND** the thank-you state is not shown

#### Scenario: Existing backend has not enabled order verification
- **GIVEN** the backend still accepts the existing birthday fields and ignores an undeclared `orderId` field
- **WHEN** it accepts the extended birthday request
- **THEN** the form shows the same successful thank-you state
