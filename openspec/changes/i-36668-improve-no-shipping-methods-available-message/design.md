## Context

`o-shipping` already receives the list of shipping methods and the existing `isShippingMethodsSyncing` state. A list with no entries is ambiguous without a separate error indicator: it can mean a request is still running, a request failed, or the address has no available methods.

The shipping form binds its address with `v-model`, and `o-base-address-form` emits a new address object on every field change. After the first edit, the form address is detached from `checkout.shippingDetails`. Until Continue, only the country is copied back to the store (`checkout-before-shippingMethods` → `updatePropValue(['country', …])`). `cart/syncShippingMethods` reads `checkout/getShippingDetails`, so country-change, ZIP-blur, and Retry lookups send the current country combined with an older postcode, street, city, and region. A signed-in customer shipping to the default address is detached immediately, because `useMyAddress()` assigns a copy of the default address.

Lookups are started by un-awaited `cart/syncTotals` calls and by Retry, without cancellation or ordering. The single `isShippingMethodsSyncing` boolean is cleared by whichever lookup finishes first, and each response replaces methods and error state when it arrives.

`saveDataToCheckout()` calls `sendDataToCheckout()`, which immediately activates the payment step, and only then awaits the forced `cart/syncTotals` that performs the first lookup with the full address.

## Goals / Non-Goals

**Goals:**

- Give `o-shipping` the minimal state it needs to render loading, error, empty, and available-method views.
- Keep the three feedback states mutually exclusive and visible to customers.
- Let customers retry a failed shipping-method lookup without submitting or advancing checkout.
- Prevent checkout progression with stale shipping methods after a failed lookup.
- Keep existing available-method rendering unchanged.
- Make every lookup started from the shipping step use the displayed form address.
- Let the most recently started lookup control methods, selection, error, and loading state.
- Prevent advancing past the shipping step without a valid shipping method for the submitted address.
- Cover these behaviors with regression unit tests.

**Non-Goals:**

- Changing shipping-method defaulting beyond clearing an invalid selection after a failed lookup.
- Adding automatic retries, retry limits, or end-to-end browser scenarios.
- Adding shipping-method guards to order confirmation or its place-order controls.
- Serializing totals and payment-method synchronization beyond the shipping-method lookup.
- Changing any API contract, virtual-cart checkout, or express checkout flows.

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

### Retry with forced shipping-method synchronization for the displayed address

The retry handler will first write the displayed form address into checkout shipping details (see the next decision), then dispatch `cart/syncShippingMethods` with `forceServerSync: true`. The action already clears the error at request start, exposes the loading state, and restores the error state if the retry fails. It will not call `sendDataToCheckout()`, because that legacy method advances the checkout page.

### Synchronize the displayed address before each lookup

Before a country-change, ZIP/postcode-blur, Retry, or Continue lookup, `o-shipping` will merge the address fields of its displayed `shipping` object into checkout shipping details with the existing `CHECKOUT_UPDATE_SHIPPING_DETAILS` merge mutation, committed the same way the Shipping mixin commits `CHECKOUT_UPDATE_PROP_VALUE`. The selected carrier and method are excluded, so a selection cleared by a failed lookup is not restored from the form. `o-shipping` overrides the mixin's `changeCountry()` to perform this write before emitting `checkout-before-shippingMethods`; this covers the signed-in default-address path, which triggers its lookup through `useMyAddress()` → `changeCountry()`. The ZIP-blur lookup therefore starts sending the edited postcode; it currently sends only the country.

Passing the address as an argument to `cart/syncShippingMethods` was rejected: the totals and payment-method synchronization that runs in the same `cart/syncTotals` flow reads `checkout/getShippingDetails` and would keep using the outdated address.

### Let the latest lookup win

`cart/syncShippingMethods` will take an increasing lookup token when it starts. The token is a cart state counter incremented by a mutation, so it is scoped to each application store rather than shared across SSR `createApp()` calls. After the request completes or throws, a lookup whose token is no longer the latest will not change shipping methods, selection, or the error flag, and will not clear the loading flag. Only the latest lookup clears the loading flag, so Continue stays disabled while that lookup is pending. Retry and Continue lookups use the same path.

A superseded lookup that throws will not rethrow, because its failure no longer describes the displayed address.

### Confirm the submitted address before Continue advances

`saveDataToCheckout()` will, after form and address validation and persisting the customer data:

1. Write the displayed address into checkout shipping details.
2. Await `cart/syncTotals` with `forceServerSync: true`, catching a thrown lookup.
3. Call `sendDataToCheckout()` only when no newer lookup is pending, the lookup has no error, the method list is not empty, and the method selected when Continue was activated is still available.

Otherwise checkout stays on the shipping step and displays the applicable error, empty, or updated method list. If the selected method disappeared, checkout stays on the shipping step with the newly defaulted method shown, so the customer sees the change before advancing. `cart/pullEstimatedShipments` is dispatched only after a successful advance.

The submission spans form validation, the address-validation dialog, the shipping-method lookup, and the payment-method and totals steps that `cart/syncTotals` runs after the lookup. The existing syncing and address-validating flags cover only parts of it, so `o-shipping` will hold a component-local submitting flag from the start of `saveDataToCheckout()` until it advances or stops. The flag is part of the Continue disabled condition, and `saveDataToCheckout()` returns immediately while it is set, so repeated activation cannot start a second submission.

### Invalidate shipping methods after every failed lookup

An unsuccessful response already replaces shipping methods with an empty list and clears the selected carrier and method. The thrown-request path will perform the same invalidation before it rethrows: it must not leave a previously valid shipping method associated with an address whose current lookup failed. This makes both failure paths represent the same unavailable result.

### Block Continue while a lookup error is active

`o-shipping` will include the synchronization-error flag in its Continue-to-payment disabled condition. Clearing stale methods disables the control through the existing empty-list condition, while the error flag remains an explicit guard if a later failure path cannot update the list.

### Cover behavior with unit tests

Regression coverage will use Jest unit tests with mocked `CartService` and store boundaries:

- `core/modules/cart/test/unit/store/methodsActions.spec.ts` for successful, empty, unsuccessful, thrown, and out-of-order lookups and the loading and error flags.
- A theme component spec for `o-shipping` (display states, lookup address, Retry, and Continue).

## Risks / Trade-offs

- [Risk] An error flag could remain set after a later successful lookup. → Mitigation: clear it at lookup start and on success.
- [Risk] Feedback states could overlap in the template. → Mitigation: derive them using the stated precedence.
- [Risk] A retry fails repeatedly. → Mitigation: the existing error state and compact Retry button are restored after every failed request.
- [Risk] A failed lookup leaves data from the prior address. → Mitigation: clear methods and the selected carrier and method for both unsuccessful and thrown requests.
- [Risk] The unvalidated displayed address is written to checkout state, and its persisted copy, before Continue. → Accepted: this matches the behavior before the form emitted copies, and Continue overwrites it with the validated address.
- [Risk] A superseded lookup's `cart/syncTotals` still runs its payment-method and totals steps. → Accepted: those steps read the current checkout state; serializing them is a non-goal.
- [Risk] A failed or empty lookup on Continue now keeps the customer on the shipping step. → Intended: the customer sees the error or empty feedback instead of leaving the shipping step without a valid method.
- [Risk] A shipping-method lookup started after the shipping step fails or invalidates the selected method while the customer is on a later step. → Accepted: order confirmation is not guarded by this change; Continue to payment guarantees a valid method for the submitted address when the customer leaves the shipping step.
