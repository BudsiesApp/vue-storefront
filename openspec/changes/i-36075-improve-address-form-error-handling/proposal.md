# Proposal

## Why

Order and customer address forms replace useful API error messages with general messages. Unexpected failures also need a safe, consistent report in Graylog.

## What Changes

- Show the server error message unchanged when an order address update or confirmation, or a customer address create or update, fails. Show a translated fallback when the response has no message.
- Show one error notification for the form. Keep success feedback and navigation from running after a failed request. Server validation messages are form-level messages, not field errors.
- Send HTTP 500–599 responses and network or timeout failures without an HTTP response directly through the error-logging module to Graylog. Other HTTP statuses only produce form feedback.
- Send an explicit, limited context with address error reports: operation, API endpoint path, status, and available user, order, and address IDs. Keep tokens and address data out of the report.

## Capabilities

### New Capabilities

- `address-form-error-handling`: Address request feedback and safe reporting for order and customer address forms.

### Modified Capabilities

None.

## Impact

- Storefront: order address actions and page, customer address actions and their account form callers.
- Shared module: one address failure reporting helper.
- Error logging: allowlisted address context fields in the existing Graylog sender; address reports use a page URL without query or fragment data.
- Magento and VSF API contracts: no change.
- Checkout address forms and background cart requests: outside this change.
