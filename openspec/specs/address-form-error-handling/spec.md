# address-form-error-handling Specification

## Purpose

This capability shows the actual address API failure message in order and customer address forms and reports server or transport failures with limited, safe context.

## Requirements

### Requirement: Address forms show API failure messages
The system SHALL show the server error message unchanged when an order address update or confirmation, or a customer address create or update, fails. A server error message is usable only when it is a string with non-whitespace text. If the response has no usable error message, the system SHALL show a translated fallback for that operation. The status code SHALL NOT change which available server message is displayed. The system SHALL show one form-level error notification and SHALL NOT put server validation messages on individual input fields.

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

#### Scenario: Server message is not a string
- **WHEN** an address request returns HTTP 500 and its `errorMessage` is an object, or an empty or whitespace-only string
- **THEN** its form shows the translated fallback in one error notification and never shows `[object Object]`
- **THEN** the address report uses the translated fallback as its message text

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

#### Scenario: Setting a stale address as default fails
- **WHEN** a customer sets an address as the default shipping or billing address from the account address list and the update fails, for example with HTTP 404 because the address was deleted in another tab
- **THEN** the list shows the failure message, or its translated fallback, in one visible error notification
- **THEN** no TaskQueue notification is shown in addition to it

### Requirement: Report only server and no-response transport failures
For HTTP statuses 500 through 599 and for network or timeout failures without an HTTP response, the system SHALL write a contextual browser console warning and submit an address-specific report to the error-logging module for Graylog delivery. It SHALL NOT produce either for any other HTTP status. A request that receives an HTTP response which cannot be processed, such as an HTML error page, an unparsable JSON body, or a JSON body without a numeric VSF API response `code`, SHALL be classified by that response's HTTP status. Only a failure without any HTTP response SHALL use status `none`. The console warning SHALL contain the same message and limited context as the address report. It SHALL NOT depend on the error-logging configuration or console verbosity. The warning SHALL NOT use `console.error`, which the error-logging module forwards to Graylog as a second report. Reporting SHALL NOT delay or prevent form feedback.

#### Scenario: HTTP 500 response
- **WHEN** an address request returns HTTP 500 with or without a server message
- **THEN** the form shows the server message if present, or a translated fallback
- **THEN** the error-logging module receives an address failure report with status 500 for Graylog

#### Scenario: Handled HTTP 503 response is visible in the console
- **WHEN** an address request returns a valid JSON response with HTTP 503 and the form handles the error
- **THEN** the browser console shows one warning with the message, operation, endpoint path, status 503, and the applicable IDs
- **THEN** the warning has no token, full URL, request or response body, or address data

#### Scenario: Error logging is not configured
- **WHEN** an address request returns HTTP 503 and `errorLogging.serviceUrl` is not configured
- **THEN** the browser console still shows the contextual warning
- **THEN** no Graylog report is sent

#### Scenario: Expected HTTP 4xx response
- **WHEN** an address request returns HTTP 400, 401, 403, 404, 409, or 422
- **THEN** the form shows the server message if present, or a translated fallback
- **THEN** the error-logging module receives no address-specific report for that response

#### Scenario: Non-JSON HTTP error response
- **WHEN** an address request receives an HTML response with HTTP 403
- **THEN** the form shows its translated fallback
- **THEN** no console warning or address-specific report is produced

#### Scenario: Non-JSON HTTP server error response
- **WHEN** an address request receives an HTML response with HTTP 503
- **THEN** the form shows its translated fallback
- **THEN** the console warning and the address failure report have status 503, not `none`

#### Scenario: JSON HTTP response without a VSF API code
- **WHEN** an address request receives HTTP 403 or 503 with `Content-Type: application/json` and the body `{"message":"Forbidden"}`, which has no `code`
- **THEN** the form shows its translated fallback
- **THEN** HTTP 403 produces no console warning or address-specific report, and HTTP 503 produces both with status 503, not `none`

#### Scenario: No-response transport failure
- **WHEN** an address request fails without an HTTP response
- **THEN** the error-logging module receives an address failure report with status `none` for Graylog
- **THEN** the form still shows its translated fallback

### Requirement: Address reports contain limited context
Each address-specific Graylog report SHALL contain exactly these structured context fields: operation, fixed API endpoint path without origin or query, status or `none`, and numeric user ID, order ID, and address ID only when applicable and available. Unavailable IDs SHALL be omitted. Its message text SHALL include the usable API error message when available, or the translated fallback otherwise, along with controlled operation, status, and applicable IDs. The reporter SHALL NOT add the raw error object, request or response body, token, full URL, name, email, phone, street, or postcode. Its page URL SHALL have no query or fragment. Existing Graylog transport metadata is outside this address-specific field list.

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

### Requirement: Sent-message storage does not block error reporting
The error-logging module SHALL send a report to Graylog even when it cannot read or write its stored list of sent messages. A report SHALL count as sent for duplicate suppression only after Graylog accepts it, and only accepted reports SHALL be written to the stored sent-message list. A report that is still being delivered SHALL suppress identical concurrent reports only in memory. This applies to address reports and to console error, window error, and unhandled rejection reports. A storage failure SHALL NOT produce an unhandled promise rejection or stop error-logging listeners from being registered.

#### Scenario: Sent-message storage write fails
- **WHEN** error logging is initialized, the next sent-message storage write rejects with `QuotaExceededError`, and an unexpected address API error occurs while Graylog is reachable
- **THEN** the address report is sent to Graylog

#### Scenario: Delivery fails after a storage failure
- **WHEN** sent-message storage cannot be written and Graylog rejects the report
- **THEN** the report is not counted as sent, and an identical later report is still sent

#### Scenario: Console or window error during a storage failure
- **WHEN** sent-message storage cannot be written and a console error or window error is reported
- **THEN** the report is sent to Graylog and no unhandled promise rejection is produced

#### Scenario: Stored sent messages cannot be restored
- **WHEN** reading or parsing the stored sent-message list fails during error-logging initialization
- **THEN** the module starts with an empty sent-message list and still registers its error listeners

#### Scenario: Failed delivery is not restored as sent
- **WHEN** Graylog rejects a report, sent-message storage writes fail, and the page is reloaded
- **THEN** the restored sent-message list does not contain that report, and an identical later report is still sent

### Requirement: TaskQueue response errors keep existing customer messages
Other storefront features that show a caught error's message SHALL show their existing fallback text when the error is a TaskQueue `TaskResponseError`, which means an HTTP response could not be processed. They SHALL keep their existing behavior for every other error. This applies to removable cart item options and the Tax ID request page. The legacy password reset page is excluded, because customers no longer sign in with a password.

#### Scenario: Cart item option update receives a gateway error page
- **WHEN** removing or restoring a cart item option fails because the cart API returns an HTML 502 response
- **THEN** the notification shows "Something went wrong"
- **THEN** it does not show the request URL, token, or cart ID

#### Scenario: Cart item option update fails with a server message
- **WHEN** removing or restoring a cart item option fails with an error that has its own message, such as a cart `ServerError` or a network failure
- **THEN** the notification shows that message, as before

#### Scenario: Tax ID request receives a gateway error page
- **WHEN** submitting a Tax ID fails because the API returns an HTML 503 response
- **THEN** the page shows the translated "Failed to submit Tax ID" fallback and not the technical response error

#### Scenario: Tax ID request fails without an HTTP response
- **WHEN** submitting a Tax ID fails because of a network failure
- **THEN** the page shows the same message as before this change
