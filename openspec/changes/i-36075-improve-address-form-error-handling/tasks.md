# Tasks

## 1. Shared address failure behavior

- [x] 1.1 Add translated fallback messages for order update, order confirmation, customer create, and customer update; run `yarn update-i18n-files` and verify the keys are present.
- [x] 1.2 Subscribe the error-logging module to the shared `REPORT_ERROR` EventBus event and extend its message type and sender with a generic structured context map; verify the address reporter supplies only operation, endpoint, status, and applicable numeric user, order, and address IDs.
- [x] 1.3 Let `logError` send a report when IP lookup rejects by using an unavailable-IP value; verify a reachable Graylog endpoint still receives the report.
- [x] 1.4 Add `reportAddressApiFailure` in `src/modules/shared/services/address-api-failure-reporter.ts` and export it from the shared module index; verify it handles numeric and numeric-string status codes, submits a report for HTTP 500–599 and no-response transport failures, and skips all other HTTP statuses.
- [x] 1.5 Send the API error message or translated fallback with controlled operation and ID context, build a page URL without query or fragment, guard browser-only reporting and missing service configuration, and catch the `logError` promise in the EventBus listener without awaiting it; verify no raw error object, request payload, or query string is added to the report and no reporting failure changes form feedback.

## 2. Order and customer requests

- [x] 2.1 Update the order address update and confirmation actions to use silent TaskQueue requests, pass the current user's numeric ID when available, report qualifying failures, and reject with `result.errorMessage` unchanged or a translated fallback; verify both actions still return `Promise<void>` and preserve successful behavior.
- [x] 2.2 Update customer address create and update actions with the same direct message access, user ID source, failure contract, and silent requests; verify their existing success events and non-form callers still distinguish success from failure.
- [x] 2.3 Show caught action messages through the existing notification path on the order address page and account add/edit forms; verify each failed request shows one notification, no field-level server errors, and no false success or navigation.
- [x] 2.4 Verify the order page's optional default customer address update and account address list operations show failure through their existing caller flows without treating it as success.

## 3. Graylog delivery and integration

- [x] 3.1 Verify the address report reaches the error-logging module with `errorLogging.serviceUrl` configured while console error output is disabled; confirm its structured Graylog fields and sanitized page URL.
- [x] 3.2 Verify HTTP 400 and 503, missing-message, and no-response failures end to end: correct form message, correct reporting decision and context, a report sent after IP lookup failure, and usable form when storage or Graylog delivery fails.
- [x] 3.3 Verify the Budsies and error-logging modules initialize without a circular-import error after the new public reporting export is used by address actions.

## 4. Review fixes

- [x] 4.1 Add `getApiErrorMessage` in `src/modules/shared/helpers/get-api-error-message.ts`, export it from the shared module index, and use it in all four address actions for the thrown and reported message; verify object, empty, and whitespace-only `errorMessage` values produce the translated fallback and a usable string is passed unchanged.
- [x] 4.2 Make sent-message storage reads, writes, and parsing best effort, keep a report out of the in-memory sent list when delivery fails, and make `logError` never reject; verify a rejected storage write still sends the report, a failed delivery does not suppress an identical later report, console and window error reports produce no unhandled rejection, and a failed restore still registers the error listeners.
- [x] 4.3 Show a visible error notification for failed default shipping and billing updates in the account address list without the duplicate screen-reader-only alert; verify address removal keeps its existing feedback.
- [x] 4.4 Write one contextual `console.warn` for each qualifying 5xx or no-response address failure before the browser and service configuration checks; verify it contains only the message and controlled context, and that no warning is written for other statuses.
- [x] 4.5 Run the affected unit tests, type check, and lint.
- [ ] 4.6 Update the storefront `src/themes/petsies-capybara` submodule pin to the theme PR revision that contains these changes, and confirm the pin in the storefront PR diff.

## 5. Second review fixes

- [x] 5.1 Make TaskQueue reject failures after an HTTP response with a `TaskResponseError` that carries the HTTP status, and take the reported status only from it in all four address actions; verify an HTML 403 is not reported, an HTML 503 is reported with status 503, an unparsable JSON body keeps its status, and a network failure is reported with status `none`.
- [x] 5.2 Track pending reports in memory and persist only reports that Graylog accepted; verify a failed delivery with failing storage writes is not restored as sent after a reload, and identical concurrent reports are still suppressed.
- [x] 5.3 Move `reportAddressApiFailure` to `src/modules/shared/services/address-api-failure-reporter.ts` and keep its shared module exports.
- [x] 5.4 Run the affected unit tests, type check, and lint.
- [x] 5.5 Validate the parsed VSF API envelope in TaskQueue and reject a JSON body without a numeric `code` with a `TaskResponseError` carrying the HTTP status; verify JSON 403 and 503 responses without `code` keep their status through TaskQueue, an address action, and the reporter.

