## 1. Shipping-Method Synchronization State

- [x] 1.1 Add an `isShippingMethodsSyncingError` state field and its mutation/getter alongside the existing shipping-method syncing state.
- [x] 1.2 Update the shipping-method synchronization action to clear the error at start and success, set it for unsuccessful or thrown requests, and clear methods and selection after either failure.

## 2. Shipping-Method Display States

- [x] 2.1 Update `o-shipping` to derive mutually exclusive loading, error, empty, and available-method display states from the shipping-method flags and list.
- [x] 2.2 Render a visible loading indicator plus accessible localized error and no-methods-available feedback while preserving the existing available-method list.
- [x] 2.3 Render the localized compact Retry button with shipping-method error feedback only.
- [x] 2.4 When Retry is activated, write the displayed form address into checkout shipping details, then dispatch a forced shipping-method synchronization without advancing checkout.
- [x] 2.5 Disable Continue to payment while shipping-method synchronization has failed.

## 3. Localization and Verification

- [x] 3.1 Update i18n files for the Retry translation key.
- [x] 3.2 Run applicable lint and type checks.

## 4. Lookup Address and Ordering

- [x] 4.1 Write the displayed form address into checkout shipping details before country-change and ZIP/postcode-blur lookups, for guest and signed-in (default address) checkout.
- [x] 4.2 Add a latest-lookup token to the shipping-method synchronization action so superseded lookups do not update methods, selection, or error state, do not clear the loading flag, and do not rethrow.

## 5. Continue-to-Payment Guard

- [x] 5.1 Make Continue to payment write the displayed address, await the forced totals sync, and call `sendDataToCheckout()` only with no newer lookup pending, no lookup error, a non-empty method list, and the selected method still available; handle a thrown lookup without an unhandled rejection and dispatch estimated shipments only after advancing.
- [x] 5.2 Keep Continue to payment disabled for the whole submission and ignore repeated activation while a submission is in progress.

## 6. Regression Coverage

- [x] 6.1 Cart action tests: successful, empty, unsuccessful, thrown, and overlapping lookups in both completion orders, including the loading and error flags.
- [x] 6.2 `o-shipping` tests: loading, error, empty, and available states; Retry payload uses the edited guest address and the signed-in default address; Retry does not advance; Continue advances only after a successful lookup with the selected method and stays on failure, empty result, or unavailable selection; Continue stays disabled and ignores repeated clicks until the submission ends.
- [x] 6.3 Run applicable lint, type checks, and unit tests.
