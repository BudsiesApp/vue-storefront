## 1. Shipping-Method Synchronization State

- [x] 1.1 Add an `isShippingMethodsSyncingError` state field and its mutation/getter alongside the existing shipping-method syncing state.
- [x] 1.2 Update the shipping-method synchronization action to clear the error at start and success, and set it for unsuccessful or thrown requests.
- [x] 1.3 Add focused cart-state/action tests for loading, successful, and failed synchronization transitions.

## 2. Shipping Component Feedback

- [x] 2.1 Update `o-shipping` to derive mutually exclusive loading, error, empty, and available-method display states from the shipping-method flags and list.
- [x] 2.2 Render a visible loading indicator plus accessible localized `Error while loading shipping methods` and `No shipping methods are available for this address.` feedback while preserving the existing available-method list.

## 3. Verification

- [x] 3.1 Run the focused cart tests, plus applicable lint and type checks.
