# Tasks

## 1. Preserve the implemented payload corrections

- [x] 1.1 Keep the existing tax-exclusive unit price/discount mapping, quantity normalization, four-decimal item rounding, selected-bundle fallback, paid-option pricing, and zero campaign price fixes; existing mapper, listener, and price-helper regression tests cover them.
- [x] 1.2 Keep event value/currency sources when totals exist, composed variants, ecommerce clearing, SHA-256/SHA3 email fields and blank-email clearing, and the configured GTM script source; existing listener and helper tests cover them.
- [x] 1.3 Keep the current first-named-category mapping and purchase custom-field rounding unchanged; existing tests describe these retained behaviors, not approval to expand their scope.

## 2. Establish cart-owned settlement and totals ownership

- [x] 2.1 Expose startup settlement across item/coupon/token/hash restore and the initial session-driven connect/pull, including `user/sessionAfterStarted` scheduling (Design 7). Reuse store-scoped operation promises, settle in `finally`, and preserve existing local-data-loaded notifications. Add maintained-suite coverage proving an empty-cache customer cart does not spend its view before connection/pull, and that startup rejection releases the boundary.
- [x] 2.2 Expose connection settlement from before quote-token fetching through pull/merge, including login and deferred reconnect, reusing existing sync waits rather than theme-inferred flags. Verify delayed token acquisition, pull, and rejection through real actions, with no self-wait between startup and connect.
- [x] 2.3 Invalidate quote-owned totals/segments and successful-totals evidence at quote replacement and explicit clear, but not on an unchanged token commit. Remove `resetTotalsSyncOnError` and failure resets; retain only necessary quote/clear invalidation. Verify same-quote failures preserve last-known totals, quote B cannot inherit A's value/coupon/timestamp, and B's first failed refresh has no A fallback.
- [x] 2.4 Reset Add processing in `finally` across the entire existing add operation without changing temporary cart-read failures into item rejections. Verify real add flow releases `getIsAdding` on stock/token/network rejection and still accepts local items retained after a non-404 cart-read failure.
- [x] 2.5 Make cart-read and in-add totals 404s that discard a local add produce the same rejected-add result and friendly translated message. Verify no `add_to_cart`, cart clearing, deferred reconnect, and a subsequent successful add with the quantity once; do not broaden this into unrelated rollback or recovery work.
- [x] 2.6 Preserve the full nested totals-busy span, latest-refresh/token guards, synchronous response application, and nonblocking `clear` reconnect. Keep focused action tests for late success/404 on a replaced quote, overlapping refreshes, and real clear/reconnect completion.

## 3. Order checkout entry around pending edits

- [x] 3.1 Give checkout a synchronously established entry-operation promise covering startup/restore, sending pending local cart edits, payment/method preparation, and its existing forced totals refresh. Reuse the cart's client-state synchronization path; preserve edits across `cart/load` and cart unmount without a new debounce registry or queue. Add maintained real-flow coverage for quantity change followed by checkout before the one-second debounce: server edit precedes totals, quantity is not reverted, and the event contains corresponding successful totals.
- [x] 3.2 Return/await the real entry refresh dispatch instead of relying on an EventBus notification's return. Preserve shipping-method notifications without a duplicate fire-and-forget refresh; expose whether entry actually attempted its refresh. Test the async payment-details idle gap with existing totals, successful entry, failed entry refresh without analytics retry, and entry failure before any refresh (one missing-totals attempt remains eligible).

## 4. Replace analytics readiness with one bounded visit flow

- [x] 4.1 Replace the three theme readiness/event composables with one client-only composable consuming startup, connection, and checkout entry boundaries. After mount and active Add/cart/totals/coupon work settle, reuse current-quote totals or make one eligible forced totals attempt if none exist and entry has not already attempted. Read current state at emission, emit once, and cancel pending visit work on unmount without cancelling shared requests. Consolidate lifecycle coverage into one suite covering both pages, current-quote reuse, one attempt, same-quote failure fallback, rejection, offline/disabled/disconnected behavior, unmount, revisits, SSR, and no second view after later login.
- [x] 4.2 Wire cart and standard checkout pages to the shared composable, excluding empty/success checkout. Remove the raw hash and `isTotalsSyncRequired` analytics gate, but preserve catalog/item-totals hash exclusions and ordinary synchronization behavior. Keep `cart-readiness-catalog-refresh.spec.ts` and consolidate the real totals-flow tests; verify catalog completion in both orders and shipping → back to cart with shipment metadata cannot suppress the view or cause an analytics-only refresh when current-quote totals exist.
- [x] 4.3 Make the cart view emit empty items without old value/coupon for an empty cart. For nonempty carts without usable totals after settlement, use existing local item mapping and omit unavailable event value/coupon instead of zero or another quote's values; keep currency sources/defaults and express-checkout triggering. Verify listener-level payloads and preceding ecommerce clear for empty, no-totals, same-quote fallback, quote replacement, and missing-totals checkout cases; leave category and purchase-rounding code/tests unchanged.
- [x] 4.4 Inspect the local browser flows after implementation: coupon/add in flight → checkout, quantity → checkout before debounce, shipping → back to cart, and a genuinely empty cart after a coupon. Verify event count, ordering, items/value/coupon, working cart UI, and absence of build-error overlays; do not treat this inspection as independent end-to-end acceptance.

## 5. Integrate and validate

- [x] 5.1 Run focused suites and the maintained suite (`yarn test:unit:maintained`) in the documented UI container, with critical core-flow assertions reachable by maintained CI. Run changed-file ESLint, `yarn type-check`, and `openspec validate i-36676-align-ecommerce-data-layer --strict`; verify the docs describe bounded fallback rather than hash readiness, failure reset, or guaranteed retry.
- [x] 5.2 Run affected core tests with `yarn test:unit:core` in the UI container; for failures establish and report the base-revision result rather than assuming they are pre-existing. Verify both companion branches together under the repository CI selection rules, keeping the unrelated payment submodule modification untouched.
- [x] 5.3 Check `rollout-notes.md` against implemented payloads and readiness behavior, including the paid-option item-event value caveat, empty-cart omission, same-quote fallback, and leaving-before-ready trade-off. Verify categories and purchase custom-field rounding remain unchanged and no new backend/dependency requirements were added.

## Workflow follow-up

- GA4 DebugView evidence for purchase value, shipping, tax, currency, coupon, and items remains an external verification requirement. Record it in final Redmine notes when access/evidence is available; outgoing network requests alone do not establish receipt.
- The release decisions on one-level item categories and purchase custom-field rounding remain open and separate from this refactor.
