# Tasks

## 1. Align ecommerce payloads

- [x] 1.1 Map tax-exclusive unit prices and numeric discounts; normalize quantity once and round unit amounts to four decimals. Use selected options in the bundle fallback, preserve existing zero campaign pricing, and correct paid-option cart pricing.
- [x] 1.2 Add normalized SHA-256 and legacy SHA3 email fields, clearing both for blank email. Preserve event value/currency sources, composed variants, ecommerce clearing, and the configured GTM script source.
- [x] 1.3 Report the first named category and round purchase `subtotal_value` and `affiliate_total` to cents.
- [x] 1.4 Mark server imports in the existing Add hook and suppress their Data Layer pushes without changing cart behavior. Cover sync and Re-order pulls with the real merge path and retain accepted/rejected Add coverage. Document the shared-tag impact and defer exact Re-order tracking.

## 2. Establish cart-owned settlement and totals ownership

- [x] 2.1 Expose startup settlement across restore and the initial session-driven connect/pull; preserve existing local-data-loaded notifications. Cover session startup scheduling and the empty-cache customer cart.
- [x] 2.2 Expose connection settlement from token fetch through pull/merge, including login and deferred reconnect. Verify the delayed token and pull paths with real store actions.
- [x] 2.3 Invalidate quote-owned totals/segments and successful-totals evidence at quote replacement and explicit clear, but not on an unchanged token commit. Verify same-quote failures preserve last-known totals and a replacement quote cannot inherit the old quote's value, coupon, or timestamp.
- [x] 2.4 Reset Add processing in `finally` across the entire existing add operation without changing temporary cart-read failures into item rejections. Verify real add flow releases `getIsAdding` on stock/token/network rejection and still accepts local items retained after a non-404 cart-read failure.
- [x] 2.5 Show a friendly cart-read 404 rejection and allow a successful retry. Keep base Add timing, including the pending-coupon exception. Use amounts supplied by a successful write for the matching line; otherwise use selected-option pricing, including when an existing line retained a prior DTO.
- [x] 2.6 Track the analytics busy span separately from the base storefront totals flag. Guard latest refresh and quote identity, apply responses synchronously, and defer `clear`'s reconnect behind active sync; cover late success/404 and overlapping refreshes.

## 3. Order checkout entry around pending edits

- [x] 3.1 Establish the entry promise on the checkout component. Skip startup/idle waits for the page; flush pending local edits before payment and the one entry methods/totals chain, or skip the flush when the cart is unchanged. Cover entry request ordering and the edited quantity and totals at emission.
- [x] 3.2 Return/await the real entry refresh dispatch instead of relying on an EventBus notification's return. Preserve shipping-method notifications without a duplicate fire-and-forget refresh. Test the async payment-details idle gap, successful entry, failed entry refresh, and entry failure before any refresh, without analytics retries.
- [x] 3.3 Require usable current-quote totals before starting standard or express payment and at final submission. Offer a business refresh when missing, and verify that a rejected submission does not consume the payment nonce/session ID.

## 4. Report visits without blocking the shopper

- [x] 4.1 Use a shared cart-view composable and a mounted checkout handler in each of the four themes. Report once after startup and active cart work, plus checkout entry where applicable. Do not initiate a totals read for analytics; cancel the visit event when the page ends without cancelling shared requests.
- [x] 4.2 Exclude empty/success checkout and recheck eligibility before emission. Exclude hydrated metadata from the synchronization hash. Cover catalog/merge ordering and returning from shipping with shipment metadata.
- [x] 4.3 Emit empty items without old value/coupon for an empty cart. For nonempty carts without usable totals, map local items and omit unavailable value/coupon. Preserve currency sources/defaults and express checkout. Verify listener payloads and preceding ecommerce clear.
- [x] 4.4 Inspect existing-cart Add and cart → immediate quantity edit → checkout in the local browser. Verify request order and usable UI; use maintained tests for event payloads without enabling the live GTM container locally.
- [x] 4.5 Run the normal post-merge business refresh when an empty local cart is populated. Verify one totals request with totals applied; on failure, report same-quote last-known totals or local items without an extra request.

## 5. Integrate and validate

- [x] 5.1 Run focused suites and `yarn test:unit:maintained` in the documented UI container. Run changed-file ESLint, `yarn type-check`, and strict OpenSpec validation.
- [x] 5.2 Run affected core tests with `yarn test:unit:core` in the UI container; for failures establish and report the base-revision result rather than assuming they are pre-existing. Verify both companion branches together under the repository CI selection rules, keeping the unrelated payment submodule modification untouched.
- [x] 5.3 Check `rollout-notes.md` against the payloads and readiness behavior, including the paid-option value caveat, empty-cart omission, same-quote fallback, and leaving-before-ready trade-off.

## Workflow follow-up

- GA4 DebugView evidence for purchase value, shipping, tax, currency, coupon, and items remains an external verification requirement. Record it in final Redmine notes when access/evidence is available; outgoing network requests alone do not establish receipt.
