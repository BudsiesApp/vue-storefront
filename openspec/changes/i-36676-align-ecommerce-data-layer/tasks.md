# Tasks

## 1. Preserve the implemented payload corrections

- [x] 1.1 Keep the existing tax-exclusive unit price/discount mapping, quantity normalization, four-decimal item rounding, selected-bundle fallback, paid-option pricing, and zero campaign price fixes; existing mapper, listener, and price-helper regression tests cover them.
- [x] 1.2 Keep event value/currency sources when totals exist, composed variants, ecommerce clearing, SHA-256/SHA3 email fields and blank-email clearing, and the configured GTM script source; existing listener and helper tests cover them.
- [x] 1.3 Keep the current first-named-category mapping and purchase custom-field rounding unchanged; existing tests describe these retained behaviors, not approval to expand their scope.

## 2. Establish cart-owned settlement and totals ownership

- [x] 2.1 Expose startup settlement across restore and the initial session-driven connect/pull; preserve existing local-data-loaded notifications. Cover session startup scheduling and the empty-cache customer cart.
- [x] 2.2 Expose connection settlement from token fetch through pull/merge, including login and deferred reconnect. Verify the delayed token and pull paths with real store actions.
- [x] 2.3 Invalidate quote-owned totals/segments and successful-totals evidence at quote replacement and explicit clear, but not on an unchanged token commit. Remove `resetTotalsSyncOnError` and failure resets; retain only necessary quote/clear invalidation. Verify same-quote failures preserve last-known totals, quote B cannot inherit A's value/coupon/timestamp, and B's first failed refresh has no A fallback.
- [x] 2.4 Reset Add processing in `finally` across the entire existing add operation without changing temporary cart-read failures into item rejections. Verify real add flow releases `getIsAdding` on stock/token/network rejection and still accepts local items retained after a non-404 cart-read failure.
- [x] 2.5 Keep the friendly cart-read 404 rejection and successful retry. Restore existing-quote Add timing including the pending-coupon exception. Report from the written line without waiting on methods/totals; verify an accepted Add settles while the chain is pending.
- [x] 2.6 Separate the analytics busy span from the base storefront totals flag. Preserve latest-refresh/token guards, synchronous response application, and nonblocking `clear` reconnect; cover late success/404 on a replaced quote, overlapping refreshes, and real clear/reconnect completion.

## 3. Order checkout entry around pending edits

- [x] 3.1 Establish the entry promise on the checkout component. Skip startup/idle waits for the page; flush pending local edits before payment and the one entry methods/totals chain, or skip the flush when the cart is unchanged. Cover entry request ordering and the edited quantity and totals at emission.
- [x] 3.2 Return/await the real entry refresh dispatch instead of relying on an EventBus notification's return. Preserve shipping-method notifications without a duplicate fire-and-forget refresh; expose whether entry actually attempted its refresh. Test the async payment-details idle gap with existing totals, successful entry, failed entry refresh without analytics retry, and entry failure before any refresh (one missing-totals attempt remains eligible).

## 4. Report visits without blocking the shopper

- [x] 4.1 Use the cart-view composable and checkout's mounted handler to report once after startup and active cart work, plus checkout entry where applicable. Keep the fallback bounded to one eligible totals read without shopper busy flags, and cancel pending event work when the page ends without cancelling shared requests.
- [x] 4.2 Exclude empty/success checkout and recheck eligibility before emission. Keep metadata out of the ordinary checkout hash check and out of analytics readiness. Keep the real catalog/merge test and cover shipping → cart with shipment metadata.
- [x] 4.3 Make the cart view emit empty items without old value/coupon for an empty cart. For nonempty carts without usable totals after settlement, use existing local item mapping and omit unavailable event value/coupon instead of zero or another quote's values; keep currency sources/defaults and express-checkout triggering. Verify listener-level payloads and preceding ecommerce clear for empty, no-totals, same-quote fallback, quote replacement, and missing-totals checkout cases; leave category and purchase-rounding code/tests unchanged.
- [x] 4.4 Inspect existing-cart Add and cart → immediate quantity edit → checkout in the local browser. Verify request order and usable UI; use maintained tests for event payloads without enabling the live GTM container locally.

## 5. Integrate and validate

- [x] 5.1 Run focused suites and the maintained suite (`yarn test:unit:maintained`) in the documented UI container, with critical core-flow assertions reachable by maintained CI. Run changed-file ESLint, `yarn type-check`, and `openspec validate i-36676-align-ecommerce-data-layer --strict`; verify the docs describe bounded fallback rather than hash readiness, failure reset, or guaranteed retry.
- [x] 5.2 Run affected core tests with `yarn test:unit:core` in the UI container; for failures establish and report the base-revision result rather than assuming they are pre-existing. Verify both companion branches together under the repository CI selection rules, keeping the unrelated payment submodule modification untouched.
- [x] 5.3 Check `rollout-notes.md` against implemented payloads and readiness behavior, including the paid-option item-event value caveat, empty-cart omission, same-quote fallback, and leaving-before-ready trade-off. Verify categories and purchase custom-field rounding remain unchanged and no new backend/dependency requirements were added.

## Workflow follow-up

- GA4 DebugView evidence for purchase value, shipping, tax, currency, coupon, and items remains an external verification requirement. Record it in final Redmine notes when access/evidence is available; outgoing network requests alone do not establish receipt.
- The release decisions on one-level item categories and purchase custom-field rounding remain open and separate from this refactor.
