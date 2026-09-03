## Context

`o-shipping` already receives the list of shipping methods and the existing `isShippingMethodsSyncing` state. A list with no entries is ambiguous without a separate error indicator: it can mean a request is still running, a request failed, or the address has no available methods.

## Goals / Non-Goals

**Goals:**

- Give `o-shipping` the minimal state it needs to render loading, error, empty, and available-method views.
- Keep the three feedback states mutually exclusive and visible to customers.
- Let customers retry a failed shipping-method lookup without submitting or advancing checkout.
- Prevent checkout progression with stale shipping methods after a failed lookup.
- Keep existing available-method rendering unchanged.

**Non-Goals:**

- Changing shipping-method selection, defaulting, or validation other than clearing an invalid selection after a failed lookup.
- Adding automatic retries, retry limits, order-confirmation guards, or end-to-end scenarios.
- Changing any API contract or checkout component other than the small cart-state source needed by `o-shipping`.

## Decisions

### Add one shipping-method synchronization-error flag

Cart state will retain the existing `isShippingMethodsSyncing` flag and add `isShippingMethodsSyncingError`. The shipping-method synchronization action clears the error flag when a lookup starts and after a successful result, and sets it when the lookup fails. This keeps request-result classification at the layer that performs the request while giving the component a simple boolean contract.

Using a component-local error flag was rejected because `o-shipping` does not own the asynchronous lookup and cannot reliably distinguish a failed request from a successful empty result.

### Derive display state in `o-shipping` with fixed precedence

`o-shipping` will render exactly one feedback state with this precedence:

1. `isShippingMethodsSyncing` → visible loading indicator.
2. `isShippingMethodsSyncingError` → `Error while loading shipping methods`.
3. No sync and no error with an empty method list → `No shipping methods are available for this address.`
4. Otherwise → existing shipping-method list.

The error and empty messages will use the existing localization and accessible status patterns in the component. The loading indicator will not include a separate text announcement. A richer lifecycle enum and request-outcome reconciliation were rejected because the two booleans already express the required UI conditions.

### Render a compact retry button with the error state

The error state will include a localized Retry button using the theme's `-small` `SfButton` modifier. It is available only after a failed lookup; the existing loading state replaces the error state as soon as the retry begins. This keeps the recovery action adjacent to the error without exposing it for successful empty results.

### Reuse forced shipping-method synchronization

The retry handler will dispatch `cart/syncShippingMethods` with `forceServerSync: true`. The existing action already clears the error at request start, exposes the loading state, and restores the error state if the retry fails. It will not call `sendDataToCheckout()`, because that legacy method advances the checkout page; retry must use the current checkout address without advancing the customer.

### Invalidate shipping methods after every failed lookup

An unsuccessful response already replaces shipping methods with an empty list and clears the selected carrier and method. The thrown-request path will perform the same invalidation before it rethrows: it must not leave a previously valid shipping method associated with an address whose current lookup failed. This makes both failure paths represent the same unavailable result.

### Block Continue while a lookup error is active

`o-shipping` will include the synchronization-error flag in its Continue-to-payment disabled condition. Clearing stale methods disables the control through the existing empty-list condition, while the error flag remains an explicit guard if a later failure path cannot update the list.

## Risks / Trade-offs

- [Risk] An error flag could remain set after a later successful lookup. → Mitigation: clear it at lookup start and on success.
- [Risk] Feedback states could overlap in the template. → Mitigation: derive them using the stated precedence.
- [Risk] A retry fails repeatedly. → Mitigation: the existing error state and compact Retry button are restored after every failed request.
- [Risk] A failed lookup leaves data from the prior address. → Mitigation: clear methods and the selected carrier and method for both unsuccessful and thrown requests.
