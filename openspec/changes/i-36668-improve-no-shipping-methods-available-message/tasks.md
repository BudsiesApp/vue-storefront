## 1. Shipping-Method Synchronization State

- [x] 1.1 Add an `isShippingMethodsSyncingError` state field and its mutation/getter alongside the existing shipping-method syncing state.
- [x] 1.2 Update the shipping-method synchronization action to clear the error at start and success, and set it for unsuccessful or thrown requests.

## 2. Shipping-Method Display States

- [x] 2.1 Update `o-shipping` to derive mutually exclusive loading, error, empty, and available-method display states from the shipping-method flags and list.
- [x] 2.2 Render a visible loading indicator plus accessible localized error and no-methods-available feedback while preserving the existing available-method list.
- [x] 2.3 Render the localized compact Retry button with shipping-method error feedback only.
- [x] 2.4 Dispatch a forced shipping-method synchronization for the current checkout address when Retry is activated, without advancing checkout.

## 3. Localization and Verification

- [x] 3.1 Update i18n files for the Retry translation key.
- [x] 3.2 Run applicable lint and type checks.
