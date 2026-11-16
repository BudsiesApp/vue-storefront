# Proposal

## Why

Order and customer address forms replace useful API error messages with general messages. Unexpected failures also need a safe, consistent report in Graylog.

## What Changes

- Show the server error message unchanged when an order address update or confirmation, or a customer address create or update, fails. Show a translated fallback when the response has no usable message: a missing, empty, or non-string `errorMessage`, such as an object returned when the VSF API cannot reach Magento.
- Show one error notification for the form. Keep success feedback and navigation from running after a failed request. Server validation messages are form-level messages, not field errors.
- Show a visible error notification when setting a default address from the account address list fails.
- Report HTTP 500–599 responses and network or timeout failures without an HTTP response to the browser console and, through the error-logging module, to Graylog. Other HTTP statuses only produce form feedback.
- Send an explicit, limited context with address error reports: operation, API endpoint path, status, and available user, order, and address IDs. Keep tokens and address data out of the report.
- Keep error-logging delivery working when the browser cannot store its list of sent messages. Do not mark a report as sent unless delivery succeeds.

## Capabilities

### New Capabilities

- `address-form-error-handling`: Address request feedback and safe reporting for order and customer address forms.

### Modified Capabilities

None.

## Impact

- Storefront: order address actions and page, customer address actions and their account form and address list callers.
- Shared module: one address failure reporting service and one API error message helper.
- Core TaskQueue: failures after an HTTP response reject with an error that keeps the HTTP status.
- Error logging: allowlisted address context fields in the existing Graylog sender; address reports use a page URL without query or fragment data; sent-message storage is best effort for every reporting path.
- Release: the storefront PR must update the `src/themes/petsies-capybara` submodule pin to the theme PR revision. Both PRs are released together.
- Magento and VSF API contracts: no change.
- Checkout address forms and background cart requests: outside this change.
