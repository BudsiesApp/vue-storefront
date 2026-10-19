# Tasks

## 1. Shared address failure behavior

- [x] 1.1 Add translated fallback messages for order update, order confirmation, customer create, and customer update; run `yarn update-i18n-files` and verify the keys are present.
- [x] 1.2 Export the existing `logError` service from `src/modules/error-logging/index.ts` and extend its message type and sender with a generic structured context map; verify the address reporter supplies only operation, endpoint, status, and applicable numeric user, order, and address IDs.
- [x] 1.3 Let `logError` send a report when IP lookup rejects by using an unavailable-IP value; verify a reachable Graylog endpoint still receives the report.
- [x] 1.4 Add `reportAddressApiFailure` in `src/modules/shared/helpers/report-address-api-failure.ts` and export it from the shared module index; verify it handles numeric and numeric-string status codes, calls `logError` for HTTP 500–599 and no-response transport failures, and skips all other HTTP statuses.
- [x] 1.5 Send the API error message or translated fallback with controlled operation and ID context, build a page URL without query or fragment, guard browser-only reporting and missing service configuration, and catch the `logError` promise without awaiting it; verify no raw error object, request payload, or query string is added to the report and no reporting failure changes form feedback.

## 2. Order and customer requests

- [x] 2.1 Update the order address update and confirmation actions to use silent TaskQueue requests, pass the current user's numeric ID when available, report qualifying failures, and reject with `result.errorMessage` unchanged or a translated fallback; verify both actions still return `Promise<void>` and preserve successful behavior.
- [x] 2.2 Update customer address create and update actions with the same direct message access, user ID source, failure contract, and silent requests; verify their existing success events and non-form callers still distinguish success from failure.
- [x] 2.3 Show caught action messages through the existing notification path on the order address page and account add/edit forms; verify each failed request shows one notification, no field-level server errors, and no false success or navigation.
- [x] 2.4 Verify the order page's optional default customer address update and account address list operations show failure through their existing caller flows without treating it as success.

## 3. Graylog delivery and integration

- [x] 3.1 Verify the address report reaches the error-logging module with `errorLogging.serviceUrl` configured while console error output is disabled; confirm its structured Graylog fields and sanitized page URL.
- [x] 3.2 Verify HTTP 400 and 503, missing-message, and no-response failures end to end: correct form message, correct reporting decision and context, a report sent after IP lookup failure, and usable form when storage or Graylog delivery fails.
- [x] 3.3 Verify the Budsies and error-logging modules initialize without a circular-import error after the new public reporting export is used by address actions.
