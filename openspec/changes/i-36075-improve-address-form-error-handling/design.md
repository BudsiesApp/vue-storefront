# Design

## Context

TaskQueue returns a `Task` with `resultCode` and `result`, but the order address update and confirmation actions and the customer address create and update actions currently return `Promise<void>`. They reject when the API response is unsuccessful. Their form callers receive no `Task`. The customer address update action also serves the order page, Tax ID page, and account address list.

The VSF API adapter places the Magento error text in `Task.result.errorMessage`. The forms currently replace thrown messages with general ones. TaskQueue shows its own notification for non-silent failures, so requests handled by these forms must be silent.

The error-logging module's `logError(ErrorMessage)` service sends reports to Graylog independently of console output. Its sender currently accepts a short message, full message, and page URL, but has no structured address context fields. Its duplicate check uses the short message and page URL. The service uses browser APIs and may reject before sending if preparation fails.

See `proposal.md` for motivation and the address form spec for required behavior.

## Goals / Non-Goals

**Goals:**
- Preserve each action's rejected-promise contract and give its caller the server message or a translated fallback.
- Report HTTP 500–599 and no-response transport failures with an exact, safe context field list.
- Keep logging independent of form feedback.

**Non-Goals:**
- Return a `Task` to form callers or add a custom error class.
- Classify errors by reading their message text or choose display text from HTTP status.
- Change checkout forms or background cart requests.
- Change Magento or VSF API response contracts.

## Decisions

### Keep API failure handling in Vuex actions

The order address update and confirmation actions and the customer address create and update actions continue to return `Promise<void>`. On a non-200 TaskQueue result, each action calls the reporting service and throws an `Error` whose message is `result.errorMessage` unchanged when present, or that action's translated fallback when absent. On a TaskQueue rejection without an HTTP response, the action reports the transport failure and throws an `Error` with the translated fallback. Successful customer address actions continue to emit their existing domain events. All four requests use `silent: true` so TaskQueue does not also show a notification.

**Alternative:** Return failed `Task` objects and let each caller inspect `resultCode`. This changes the existing rejection contract, including other callers of `budsies/updateAddress`, and makes an unchecked failure look like success.

### Report only 5xx and no-response failures

Put the side-effecting `reportAddressApiFailure` helper in `src/modules/shared/helpers/report-address-api-failure.ts` and export it from the shared module index. The Budsies and orders-history actions consume that public export after receiving a failed `Task` or catching a TaskQueue rejection. The helper converts a numeric `resultCode` or numeric string to an HTTP status, then calls the public `logError` export from `src/modules/error-logging` only for statuses 500 through 599 and for a transport rejection with no HTTP response. Every other HTTP status, including 400, 401, 403, 404, 409, and 422, produces form feedback without an address report. The helper does not decide the text shown to the user.

Extend the error-logging module's `ErrorMessage` with an optional generic `context` map. The sender maps its entries to separate Graylog GELF fields. The address reporter constructs only these fields:

| Context field | GELF key | Value and source |
| --- | --- | --- |
| `operation` | `_operation` | One fixed value: `order-address-update`, `order-address-confirmation`, `customer-address-create`, or `customer-address-update`. |
| `endpoint` | `_endpoint` | One fixed API path matching the operation: `/order/address/update-requests`, `/order/address/confirmation-requests`, `/address/create`, or `/address/update`. No origin or query string. |
| `status` | `_status` | The numeric HTTP status, or `none` for a no-response transport rejection. |
| `userId` | `_userId` | Numeric customer ID from the core `user/current` Vuex getter when available; omit otherwise. |
| `orderId` | `_orderId` | Numeric order ID for order operations; use `OrderAddress.parent_id` for update and pass the current order ID as action metadata for confirmation. Omit for customer address operations. |
| `addressId` | `_addressId` | Numeric address ID for update or confirmation when available; omit for customer address create. |

These six fields are the complete address-specific context. Use the API error message in the report when available, or the translated fallback when it is absent. Do not pass the raw error object, request or response body, token, full URL, or address payload to the reporter. Use typed numeric IDs when available and fixed operation and endpoint values. Include the message, operation, status, and applicable IDs in `shortMessage` so the existing duplicate check does not collapse distinct address failures; use the message as `fullMessage`.

The Vuex action reads `rootGetters['user/current']?.id` and passes a numeric `userId` to the reporting service when available. The reporting service does not keep user state. Existing Graylog infrastructure already supplies its own timestamp, user agent, client IP, and trace ID, so the address context does not duplicate them.

**Alternative:** Send the context through `Logger.error`. In production, its console output depends on global logger settings, and the console interceptor ignores the third logger argument. Direct use of the reporting module avoids both constraints.

### Show one message at the submitting UI

The order address page and account add/edit forms catch the action's rejected promise and send `error.message` to their existing `notification/spawnNotification` path. The account address list's existing action error presentation also receives the improved message. The order page retains its current page and does not show success or navigate after failure. Server validation messages remain form-level notifications, not field errors.

The order page may also call the shared customer address update action to update the default shipping address. A failure there follows the same rejection contract and produces one form notification. No component inspects `Task` or calls the reporting service.

### Send without blocking the form

Export `logError` from the error-logging module's public `index.ts`; address code does not import its private sender. The address reporting service runs only in the browser and only when `errorLogging.serviceUrl` is configured. It constructs `currentUrl` from the page origin and pathname, excluding query parameters and fragments. It starts `logError` without awaiting it and catches a rejected promise so storage or Graylog failures cannot alter form feedback. The existing `logError` service must continue toward Graylog with an unavailable-IP value if its separate IP lookup fails; that lookup is not a prerequisite for sending the address report. No production console verbosity change or console interceptor change is needed.

**Alternative:** Call the Graylog endpoint from address actions. That would duplicate the existing reporting transport, deduplication, and metadata.

## Risks / Trade-offs

- [TaskQueue already logs some rejected transport requests] → A generic console report may accompany the direct address report. Verify the address report independently; do not promise one total Graylog entry for a network failure.
- [The Graylog sender imports Budsies debug data, while Budsies actions will import the address reporter] → Keep reporting calls out of module initialization and verify both modules load before an address request.
- [A server message may contain technical text] → The same message is shown to the user and sent in the address report, as requested.
- [A request may have no current user] → Omit `userId`; never infer it from an address payload.
- [The existing error logger suppresses duplicate reports and bot traffic] → Preserve those rules and verify a distinct address failure reaches Graylog when the service is configured.
- [Graylog or report preparation can fail] → Leave the form usable and show feedback without waiting for delivery.

## Migration Plan

Deploy the storefront with `errorLogging.serviceUrl` configured. No console verbosity, Magento API, VSF API, or data migration is required. Roll back the storefront change if necessary.
