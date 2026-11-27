# Proposal

## Why

Cart-page express checkout can open a wallet with the grand total from before a cart change during a quantity input's debounce, cart write, coupon request or background methods/totals refresh. Merely waiting for the refresh to end is insufficient: a failed refresh leaves the same old totals available.

## What Changes

- Keep eligible PayPal, Pay Later, Apple Pay and Google Pay buttons visible but visibly inactive from the shopper's quantity change, including its unsent debounce interval, through the cart write and totals settlement. Other cart edits retain their existing write/coupon-processing gate.
- Derive the quantity gate by comparing current quantities with the last applied item totals, reusing the existing busy and failed-refresh signals for the rest of the flow. Add no pending-edit state.
- Reject activation during that interval without queuing it; a successful refresh enables a new shopper click using the updated grand total.
- Keep express checkout unavailable after an unsuccessful refresh, even when last-known same-quote totals remain, and reuse the existing totals-unavailable message and manual refresh action for recovery.
- The shared inactive wrapper also covers an Amazon Pay button if configured; no Amazon Pay SDK changes are introduced.
- Preserve asynchronous Add, cart-edit and navigation behavior, existing current-totals payment behavior, and analytics' separate same-quote fallback policy.
- Keep the existing quantity-input delay of up to one second before sending a change; only express payment becomes inactive earlier. Keep the existing totals retry available under its current busy policy rather than blocking it on the quantity comparison.
- Retain one PayPal/Pay Later click check, without a second check before the payment request. Cart edits after an accepted click, additional grand-total-line validation and on-page recovery for a changed quantity that never reaches the server (another cart edit or a reload restores the buttons) remain outside this change.

## Capabilities

### New Capabilities

- `checkout-payment-readiness`: Holds the payment-totals requirement "Payment requires valid current-quote totals", moved from `ecommerce-data-layer` with its existing standard-checkout and final-submission guarantees. It is extended with immediate quantity-edit blocking, cart-write/coupon readiness through totals application, inactive presentation, failure recovery and non-blocking cart interactions.

### Modified Capabilities

- `ecommerce-data-layer`: Remove the payment-totals requirement, which moves to `checkout-payment-readiness`. Its other requirements are unchanged.

## Impact

- Application repository: cart Vuex totals lifecycle, the shared cart-busy predicate, a derived quantity-versus-applied-totals getter consumed by express readiness, and related tests. Preserve the ownership check before a totals/shipping request as well as after its response.
- `vsf-capybara` at `src/themes/petsies-capybara`: express button presentation and opt-in reuse of `checkout-totals-retry.vue`; shared behavior applies to Petsies, Budsies, Waggables and Stuffed Animal Pros (the BulkOrders storefront).
- `vsf-payment-braintree` at `src/modules/payment-braintree`: express-only activation checks at PayPal/Pay Later, Apple Pay and Google Pay SDK entry points, using the shared payment-method mixin for the readiness policy.
- No backend/API contract, dependency, deployment configuration, standard-checkout flow, mini-cart or Education changes.
