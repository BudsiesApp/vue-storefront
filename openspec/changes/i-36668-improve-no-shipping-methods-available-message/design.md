## Context

`o-shipping` already receives the list of shipping methods and the existing `isShippingMethodsSyncing` state. A list with no entries is ambiguous without a separate error indicator: it can mean a request is still running, a request failed, or the address has no available methods.

The shipping form binds its address with `v-model`, and `o-base-address-form` emits a new address object on every field change. After the first edit, the form address is detached from `checkout.shippingDetails`. Until Continue, only the country is copied back to the store (`checkout-before-shippingMethods` → `updatePropValue(['country', …])`). `cart/syncShippingMethods` reads `checkout/getShippingDetails`, so country-change, ZIP-blur, and Retry lookups send the current country combined with an older postcode, street, city, and region. A signed-in customer shipping to the default address is detached immediately, because `useMyAddress()` assigns a copy of the default address.

Lookups are started by un-awaited `cart/syncTotals` calls and by Retry, without cancellation or ordering. The single `isShippingMethodsSyncing` boolean is cleared by whichever lookup finishes first, and each response replaces methods and error state when it arrives.

`saveDataToCheckout()` calls `sendDataToCheckout()`, which immediately activates the payment step, and only then awaits the forced `cart/syncTotals` that performs the first lookup with the full address. `sendDataToCheckout()` emits the component's current `shipping` object, and the address fields stay editable unless the default-address option is selected.

On the order-review step, `o-confirm-order` lets customers apply a coupon. Coupon processing runs a forced `cart/syncTotals`, which repeats the shipping-method lookup and clears methods and the selected carrier and method when the lookup fails or returns no methods. The place-order disabled condition checks coupon, totals, and payment-method synchronization but not shipping state, so it becomes enabled again once those finish. The same disabled state is passed to payment-method components as `is-order-placement-disabled`; the PayPal button is hidden while it is set.

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
- Prevent advancing with an address other than the one the final lookup checked.
- Prevent payment initiation and order placement for a physical cart without a valid selected shipping method.
- Cover these behaviors with regression unit tests.

**Non-Goals:**

- Changing shipping-method defaulting beyond clearing an invalid selection after a failed lookup.
- Adding automatic retries, retry limits, or end-to-end browser scenarios.
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

### Lock and confirm the submitted address during the final lookup

Right before Continue writes the displayed address and starts the forced `cart/syncTotals`, `o-shipping` takes a copy of the displayed address fields (excluding carrier and method) and sets a component-local address-lock flag until the submission ends. While the flag is set, the address fields are disabled through `o-base-address-form`'s `is-form-fields-disabled` prop and the default-address checkbox is disabled. The lock starts after form and address validation, so focusing the first invalid field and applying an address-validation suggestion keep working.

After the lookup, `sendDataToCheckout()` is called only when the displayed address still equals the copy. This also covers changes that do not come from typing, such as a login or checkout-load handler replacing the form address. If it differs, checkout stays on the shipping step; Continue becomes available again and a new submission checks the changed address.

Automatically re-running the lookup for a changed address was rejected: with the lock in place, the address can change only through non-form paths, and stopping on the shipping step lets the customer see the result for the changed address before advancing.

### Guard order placement on the order-review step

`o-confirm-order` will treat the shipping method as confirmed when the cart is virtual, or when shipping-method synchronization is neither pending nor failed and the selected carrier and method exactly match an available method. The fallback selection of `getAvailableShippingMethod()` is not used, because it would report a method the customer did not select as valid.

- The confirmed state is added to the place-order disabled condition, so the place-order button and the PayPal button (through `is-order-placement-disabled`) are disabled while a lookup is pending, after a failure, or with no valid selection.
- `onPlaceOrder()` returns before starting payment, and `placeOrder()` returns without emitting `checkout-before-placeOrder` (resetting the in-progress flag), when the shipping method is not confirmed. This covers completion callbacks of payment components started before the shipping method became invalid.
- When synchronization is not pending and the method is not confirmed for a physical cart, an alert explains `The selected shipping method is no longer available. Please review your shipping details.` with an Edit shipping button that emits `checkout-before-edit` for the shipping step, where the existing error, empty, and Retry states apply.

A cart-level getter was rejected because only these two components need the check and `o-shipping` already compares against the selection captured when Continue was activated.

### Invalidate shipping methods after every failed lookup

An unsuccessful response already replaces shipping methods with an empty list and clears the selected carrier and method. The thrown-request path will perform the same invalidation before it rethrows: it must not leave a previously valid shipping method associated with an address whose current lookup failed. This makes both failure paths represent the same unavailable result.

### Block Continue while a lookup error is active

`o-shipping` will include the synchronization-error flag in its Continue-to-payment disabled condition. Clearing stale methods disables the control through the existing empty-list condition, while the error flag remains an explicit guard if a later failure path cannot update the list.

### Cover behavior with unit tests

Regression coverage will use Jest unit tests with mocked `CartService` and store boundaries:

- `core/modules/cart/test/unit/store/methodsActions.spec.ts` for successful, empty, unsuccessful, thrown, and out-of-order lookups and the loading and error flags.
- A theme component spec for `o-shipping` (display states, lookup address, Retry, Continue, and address changes during the final lookup).
- A theme component spec for `o-confirm-order` (order-review guard after failed and empty lookups, pending lookups, unavailable selection, and virtual carts).

## Risks / Trade-offs

- [Risk] An error flag could remain set after a later successful lookup. → Mitigation: clear it at lookup start and on success.
- [Risk] Feedback states could overlap in the template. → Mitigation: derive them using the stated precedence.
- [Risk] A retry fails repeatedly. → Mitigation: the existing error state and compact Retry button are restored after every failed request.
- [Risk] A failed lookup leaves data from the prior address. → Mitigation: clear methods and the selected carrier and method for both unsuccessful and thrown requests.
- [Risk] The unvalidated displayed address is written to checkout state, and its persisted copy, before Continue. → Accepted: this matches the behavior before the form emitted copies, and Continue overwrites it with the validated address.
- [Risk] A superseded lookup's `cart/syncTotals` still runs its payment-method and totals steps. → Accepted: those steps read the current checkout state; serializing them is a non-goal.
- [Risk] A failed or empty lookup on Continue now keeps the customer on the shipping step. → Intended: the customer sees the error or empty feedback instead of leaving the shipping step without a valid method.
- [Risk] A shipping-method lookup started after the shipping step fails or invalidates the selected method while the customer is on the order-review step. → Mitigation: order placement is disabled and refused until the customer returns to the shipping step and selects an available method.
- [Risk] A payment component reports success after the shipping method became invalid, so payment was authorized without an order. → Accepted: refusing the order is preferable to placing it without a valid shipping method. Payment-provider handling of the unused authorization is not verified.
- [Risk] A successful lookup on the order-review step silently replaces an unavailable selected method with the default method. → Accepted: existing behavior; the replacement is a valid method and is shown in the review summary.
