# Design

## Context

TaskQueue returns a `Task` with `resultCode` and `result`, but the order address update and confirmation actions and the customer address create and update actions currently return `Promise<void>`. They reject when the API response is unsuccessful. Their form callers receive no `Task`. The customer address update action also serves the order page, Tax ID page, and account address list.

The VSF API adapter places the Magento error text in `Task.result.errorMessage`. That value is not always a string: when the VSF API cannot reach Magento it can be an object, and `new Error(object)` produces the message `[object Object]`. The forms currently replace thrown messages with general ones. TaskQueue shows its own notification for non-silent failures, so requests handled by these forms must be silent. The account address list previously relied on that TaskQueue notification; once the request is silent, the list renders its error only in screen-reader-only text.

The error-logging module's `logError(ErrorMessage)` service sends reports to Graylog independently of console output. Its sender currently accepts a short message, full message, and page URL, but has no structured address context fields. Its duplicate check uses the short message and page URL. It adds a report to the in-memory sent list and then awaits a `localStorage` write before sending. A rejected write, such as `QuotaExceededError`, makes `logError` reject before sending while the report stays in the in-memory sent list, so an identical later report is suppressed. The console error, window error, and unhandled rejection listeners call `logError` without handling that rejection.

See `proposal.md` for motivation and the address form spec for required behavior.

## Goals / Non-Goals

**Goals:**
- Preserve each action's rejected-promise contract and give its caller a usable server message or a translated fallback.
- Report HTTP 500–599 and no-response transport failures to the browser console and Graylog with an exact, safe context field list.
- Keep logging independent of form feedback, and keep Graylog delivery independent of browser storage.
- Release the storefront and theme revisions together.

**Non-Goals:**
- Return a `Task` to form callers or add a custom error class.
- Classify errors by reading their message text or choose display text from HTTP status.
- Change checkout forms or background cart requests.
- Change Magento or VSF API response contracts.
- Change the TaskQueue notification behavior of the address removal request.

## Decisions

### Keep API failure handling in Vuex actions

The order address update and confirmation actions and the customer address create and update actions continue to return `Promise<void>`. On a non-200 TaskQueue result, each action calls the reporting service and throws an `Error` whose message is a usable `result.errorMessage` unchanged, or that action's translated fallback otherwise. On a TaskQueue rejection without an HTTP response, the action reports the transport failure and throws an `Error` with the translated fallback. Successful customer address actions continue to emit their existing domain events. All four requests use `silent: true` so TaskQueue does not also show a notification.

A shared pure helper, `getApiErrorMessage(result, fallback)` in `src/modules/shared/helpers/get-api-error-message.ts`, returns `result.errorMessage` only when it is a string with non-whitespace text, and the fallback otherwise. Both the thrown message and the reported message come from it, so neither the UI nor the logging service receives a non-string value.

TaskQueue resolves a JSON response of any status, but rejects when the response is not JSON or its JSON cannot be processed. It currently rejects with a string or a `SyntaxError`, which loses the HTTP status, and network failures never carry a response. It also resolves a parsed JSON body without a `code`, such as `{"message":"Forbidden"}` from a proxy, with `resultCode: undefined`, which the actions would report as a no-response failure. TaskQueue therefore validates the VSF API envelope after parsing: the body must be an object with a numeric `code`. Every TaskQueue endpoint is a VSF API or VSF API extension endpoint that returns this envelope. TaskQueue rejects every failure that happened after an HTTP response, including an invalid envelope, with a `TaskResponseError`, defined in `core/lib/sync/types/TaskResponseError.ts`, that carries that response's HTTP `status` and keeps the existing message text. Network and timeout failures keep their original rejection. The address actions take the status only from a `TaskResponseError`, so an HTML 403 is an expected 4xx failure and an HTML 503 is reported as 503. Only a failure without an HTTP response is reported with status `none`. Both kinds of rejection show the translated fallback, because a response that cannot be processed has no usable server message.

**Alternative:** Return failed `Task` objects and let each caller inspect `resultCode`. This changes the existing rejection contract, including other callers of `budsies/updateAddress`, and makes an unchecked failure look like success.

**Alternative:** Serialize a non-string `errorMessage` into the displayed text. The object is not written for customers and may contain internal details.

### Report only 5xx and no-response failures

Put the side-effecting `reportAddressApiFailure` service in `src/modules/shared/services/address-api-failure-reporter.ts` and export it from the shared module index. It is a service, not a helper, because it writes console output and emits an EventBus event; helpers stay pure. The Budsies and orders-history actions consume that public export after receiving a failed `Task` or catching a TaskQueue rejection. The service converts a numeric `resultCode` or numeric string to an HTTP status, then reports only statuses 500 through 599 and a transport rejection with no HTTP response. Every other HTTP status, including 400, 401, 403, 404, 409, and 422, produces form feedback without a console warning or address report. The service does not decide the text shown to the user.

Extend the error-logging module's `ErrorMessage` with an optional generic `context` map. The sender maps its entries to separate Graylog GELF fields. The address reporter constructs only these fields:

| Context field | GELF key | Value and source |
| --- | --- | --- |
| `operation` | `_operation` | One fixed value: `order-address-update`, `order-address-confirmation`, `customer-address-create`, or `customer-address-update`. |
| `endpoint` | `_endpoint` | One fixed API path matching the operation: `/order/address/update-requests`, `/order/address/confirmation-requests`, `/address/create`, or `/address/update`. No origin or query string. |
| `status` | `_status` | The numeric HTTP status, or `none` for a no-response transport rejection. |
| `userId` | `_userId` | Numeric customer ID from the core `user/current` Vuex getter when available; omit otherwise. |
| `orderId` | `_orderId` | Numeric order ID for order operations; use `OrderAddress.parent_id` for update and pass the current order ID as action metadata for confirmation. Omit for customer address operations. |
| `addressId` | `_addressId` | Numeric address ID for update or confirmation when available; omit for customer address create. |

These six fields are the complete address-specific context. Use the usable API error message in the report when available, or the translated fallback otherwise. Do not pass the raw error object, request or response body, token, full URL, or address payload to the reporter. Use typed numeric IDs when available and fixed operation and endpoint values. Include the message, operation, status, and applicable IDs in `shortMessage` so the existing duplicate check does not collapse distinct address failures; use the message as `fullMessage`.

The Vuex action reads `rootGetters['user/current']?.id` and passes a numeric `userId` to the reporting service when available. The reporting service does not keep user state. Existing Graylog infrastructure already supplies its own timestamp, user agent, client IP, and trace ID, so the address context does not duplicate them.

### Write a console warning for every reported failure

For every qualifying failure, the reporter first writes one `console.warn` with a fixed `Address API failure` prefix, the message, and the same context object it sends to Graylog. It does this before checking for the browser or error-logging configuration, so console diagnostics do not depend on Graylog being configured. The warning contains only the controlled context, never the request, response, token, or address data.

**Alternative:** `console.error`. The error-logging module replaces `console.error` and would forward the same failure to Graylog a second time as an unstructured string report.

**Alternative:** `Logger.error`. Its production output depends on global logger verbosity settings.

### Deliver address reports through the EventBus

Address code does not import the error-logging module, because the Graylog sender already imports Budsies debug data and the Budsies actions would otherwise form an import cycle. The reporter emits the `REPORT_ERROR` EventBus event, exported from the shared module, with the report. The error-logging module subscribes to it in `afterRegistration`, which runs only in the browser and only when `errorLogging.serviceUrl` is configured. The listener starts `logError` without awaiting it and catches its rejection, so Graylog failures cannot alter form feedback or later EventBus listeners. The reporter also skips the event on the server or without a configured service. It constructs `currentUrl` from the page origin and pathname, excluding query parameters and fragments. If the separate IP lookup fails, `logError` sends the report with an unavailable-IP value. No production console verbosity change or console interceptor change is needed.

**Alternative:** Call the Graylog endpoint from address actions. That would duplicate the existing reporting transport, deduplication, and metadata.

### Persist only delivered reports

The sent-message keeper holds two in-memory sets: confirmed reports and reports whose delivery is pending. `logError` checks both sets, then marks the report pending synchronously, before any `await`, so identical concurrent reports are suppressed. After Graylog accepts the report, the keeper moves it to the confirmed list, replacing an expired entry with the same hash, and persists only that confirmed list. When delivery fails, the keeper only clears the pending mark, so nothing undelivered is ever written to storage. A failed storage cleanup can therefore no longer leave an undelivered report that is restored as sent after a reload. Pending marks are never persisted.

Saving the confirmed list to `localStorage` is best effort: the keeper catches storage read, write, and parse failures and never rejects because of them. If the confirmed list cannot be saved, an identical report may be sent again after a reload; a duplicate is preferable to a lost report. `logError` catches every internal failure and does not reject, so the console error, window error, and unhandled rejection listeners cannot create unhandled rejections. That also prevents a feedback loop through the unhandled rejection listener. If restoring stored messages fails during initialization, the module starts with an empty list and still registers its listeners.

A storage failure cannot be written with `console.error`, because the console interceptor would send it back through `logError`. The keeper ignores storage failures silently, because the report itself is still delivered.

**Alternative:** Persist the report before delivery and remove it if delivery fails. A failed removal write leaves an undelivered report in storage, which suppresses identical reports after a reload.

### Show one message at the submitting UI

The order address page and account add/edit forms catch the action's rejected promise and send `error.message` to their existing `notification/spawnNotification` path. The order page retains its current page and does not show success or navigate after failure. Server validation messages remain form-level notifications, not field errors.

When setting a default shipping or billing address fails, the account address list sends the caught message, or its translated fallback, to the same visible `notification/spawnNotification` path. The notification component is already a `role="alert"` region, so these failures do not also write the screen-reader-only alert text; that avoids a duplicate announcement. Address removal still uses a non-silent TaskQueue request that shows its own notification, so its failure keeps the existing screen-reader-only alert and gets no extra notification.

The order page may also call the shared customer address update action to update the default shipping address. A failure there follows the same rejection contract and produces one form notification. No component inspects `Task` or calls the reporting service.

### Release the storefront and theme together

The account forms, order address page, and address list are in the `petsies-capybara` theme submodule. The storefront branch must pin `src/themes/petsies-capybara` to the theme PR revision. After merging the theme branch into the storefront branch, check the pin again because the merge can reset it to the base branch revision. Both PRs are merged and released together.

## Risks / Trade-offs

- [TaskQueue already logs some rejected transport requests] → A generic console report may accompany the direct address report. Verify the address report independently; do not promise one total Graylog entry for a network failure.
- [A server message may contain technical text] → The same usable message is shown to the user and sent in the address report, as requested.
- [A request may have no current user] → Omit `userId`; never infer it from an address payload.
- [The existing error logger suppresses duplicate reports and bot traffic] → Preserve those rules and verify a distinct address failure reaches Graylog when the service is configured.
- [Graylog or report preparation can fail] → Leave the form usable and show feedback without waiting for delivery.
- [Sent-message storage is unavailable] → Duplicate suppression works only for the current page lifetime; reports are still delivered.
- [The storefront pin can drift from the theme PR] → Check the submodule pin in the storefront PR diff before release.

## Migration Plan

Deploy the storefront with `errorLogging.serviceUrl` configured and the theme pin set to the theme PR revision. No console verbosity, Magento API, VSF API, or data migration is required. Roll back both PRs together if necessary.
