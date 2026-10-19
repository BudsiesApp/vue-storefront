# Spec Delta

## Purpose

This capability shows the actual address API failure message in order and customer address forms and reports server or transport failures with limited, safe context.

## ADDED Requirements

### Requirement: Address forms show API failure messages
The system SHALL show the server error message unchanged when an order address update or confirmation, or a customer address create or update, fails. If the response has no non-empty error message, the system SHALL show a translated fallback for that operation. The status code SHALL NOT change which available server message is displayed. The system SHALL show one form-level error notification and SHALL NOT put server validation messages on individual input fields.

#### Scenario: Order address is no longer editable
- **WHEN** the order address update API returns HTTP 400 with the message "This order address can no longer be edited. Please contact customer support for assistance."
- **THEN** the order address form shows that message unchanged in one error notification
- **THEN** the page does not show success or navigate away

#### Scenario: Customer address save fails
- **WHEN** a customer address create or update response contains a non-empty error message
- **THEN** the account form shows that message unchanged in one error notification
- **THEN** the form does not show save success

#### Scenario: No server message is available
- **WHEN** an order or customer address request fails without an error message
- **THEN** its form shows a translated fallback in one error notification

#### Scenario: Request has no HTTP response
- **WHEN** an order or customer address request fails because of a network error or timeout
- **THEN** its form shows a translated fallback and stays usable

### Requirement: Address failures preserve caller behavior
Order address update and confirmation actions and customer address create and update actions SHALL reject on failed requests. A failed customer address update SHALL also be observable to its existing non-form callers. Success events, success notifications, and success navigation SHALL occur only after successful requests.

#### Scenario: Default customer address update fails on the order page
- **WHEN** the order address request succeeds but updating the default customer address fails
- **THEN** the order page shows the failure message and does not show update success

#### Scenario: Account address list update fails
- **WHEN** an account address list operation uses the customer address update action and its request fails
- **THEN** the list receives a rejected action and does not present the operation as successful

### Requirement: Report only server and no-response transport failures
The system SHALL submit an address-specific report directly to the error-logging module for Graylog delivery for HTTP statuses 500 through 599 and for network or timeout failures without an HTTP response. It SHALL NOT submit an address-specific report for any other HTTP status. Reporting SHALL NOT depend on console verbosity and SHALL NOT delay or prevent form feedback.

#### Scenario: HTTP 500 response
- **WHEN** an address request returns HTTP 500 with or without a server message
- **THEN** the form shows the server message if present, or a translated fallback
- **THEN** the error-logging module receives an address failure report with status 500 for Graylog

#### Scenario: Expected HTTP 4xx response
- **WHEN** an address request returns HTTP 400, 401, 403, 404, 409, or 422
- **THEN** the form shows the server message if present, or a translated fallback
- **THEN** the error-logging module receives no address-specific report for that response

#### Scenario: No-response transport failure
- **WHEN** an address request fails without an HTTP response
- **THEN** the error-logging module receives an address failure report with status `none` for Graylog
- **THEN** the form still shows its translated fallback

### Requirement: Address reports contain limited context
Each address-specific Graylog report SHALL contain exactly these structured context fields: operation, fixed API endpoint path without origin or query, status or `none`, and numeric user ID, order ID, and address ID only when applicable and available. Unavailable IDs SHALL be omitted. Its message text SHALL include the API error message when available, or the translated fallback otherwise, along with controlled operation, status, and applicable IDs. The reporter SHALL NOT add the raw error object, request or response body, token, full URL, name, email, phone, street, or postcode. Its page URL SHALL have no query or fragment. Existing Graylog transport metadata is outside this address-specific field list.

#### Scenario: Order address update returns HTTP 503
- **WHEN** the order address update returns HTTP 503 and user, order, and address IDs are available
- **THEN** the address-specific report contains the operation, fixed endpoint path, status 503, user ID, order ID, and address ID
- **THEN** the report contains the server error message but no address fields or token added from the request

#### Scenario: Customer address create has no available IDs
- **WHEN** a customer address create request has no available user ID or address ID and fails without an HTTP response
- **THEN** the address-specific report contains its operation, fixed endpoint path, and status `none`
- **THEN** unavailable IDs are omitted

#### Scenario: Page URL has query data
- **WHEN** the address reporting service sends a report from a page URL with query parameters or a fragment
- **THEN** its Graylog page URL contains neither the query parameters nor the fragment

#### Scenario: Console error output is disabled
- **WHEN** an address request returns HTTP 503 while production console error output is disabled
- **THEN** the address-specific report still reaches the error-logging module for Graylog

#### Scenario: IP lookup fails
- **WHEN** an address report is submitted and the optional IP lookup fails while Graylog is reachable
- **THEN** the reporting module still sends the address report to Graylog without a resolved IP

#### Scenario: Graylog delivery fails
- **WHEN** Graylog cannot accept an address failure report
- **THEN** the form still shows its error and remains usable
