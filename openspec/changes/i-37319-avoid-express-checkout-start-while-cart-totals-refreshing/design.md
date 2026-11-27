# Design

## Context

See [proposal.md](proposal.md) for the problem and [the spec delta](specs/ecommerce-data-layer/spec.md) for the contract.

The checked-out application includes the totals lifecycle introduced by #36676. `cart/isTotalsSettling` uses `totalsSyncDepth` to cover `syncTotals`' methods preparation and nested `overrideServerTotals` response application. `IS_TOTALS_SYNCING` covers only the HTTP portion and must not be widened. `overrideServerTotals` already numbers requests and rejects superseded or replaced-quote responses.

Cart writes and coupon requests precede that totals span. `cart/isCartBusy` shares `getIsAdding || IS_CART_SYNCING || isTotalsSettling || IS_COUPON_PROCESSING` with `waitForIdle`. Quantity input first commits locally and waits for its existing 1000 ms debounce before dispatching `cart/sync`; busy flags alone do not cover that unsent interval. Successfully applied item totals are already stored by server item ID in `itemsAfterPlatformTotals` and include the quantity represented by those totals.

`cart/getPaymentTotals` checks successful current-quote totals and valid monetary fields, but intentionally continues returning last-known totals after a failed same-quote refresh. Analytics relies on that fallback. The successful-sync timestamp is neither a failure flag nor proof that the latest refresh succeeded.

In `vsf-capybara`, `components/checkout/express-checkout-buttons.vue` preserves mounted wallet components with `v-show` when `getPaymentTotals` exists and consumes shared express readiness for its inactive wrapper. `checkout-totals-retry.vue` has an opt-in express context for retained-totals failures; standard checkout also uses that component with the default policy.

In `vsf-payment-braintree`, the `PaymentMethod` mixin supplies `isExpressCheckout`, shared initiation readiness and the existing grand-total segment value. PayPal renders both PayPal and Pay Later through SDK callbacks, Apple Pay creates a session in `doPayment`, and Google Pay builds its request locally before `loadPaymentData`. The Google Payment instance is created with `client`; Braintree's `createPaymentDataRequest` is synchronous in that mode, despite the component's `await`.

The affected repositories are the application, `vsf-capybara`, and `vsf-payment-braintree`. `vsf-cache-varnish` is unaffected. Brand variants consume the shared cart/payment components; the behavior also needs to reach the BulkOrders/Stuffed Animal Pros theme variant, without adding brand-specific policy.

## Goals / Non-Goals

**Goals:**

- Establish one store-owned express-start readiness policy, consumed by both presentation and wallet initiation.
- Distinguish a failed refresh from an idle successful cart without discarding useful display/analytics totals.
- Keep all new work a small extension to existing store and wallet integration code.

**Non-Goals:**

- No new asynchronous checkout queue, persisted freshness cache, cart hash readiness scheme, polling, automatic retry or payment state machine.
- No changes to Add completion, cart sync wait policies, quantity debouncing, cart navigation, analytics settlement or standard checkout.
- No change to authorization, wallet shipping callbacks, final order preparation, nonce consumption or wallet availability detection.
- No PayPal/Pay Later `createOrder` recheck, additional grand-total-line validation or new quantity-based disabling of the totals retry.

## Decisions

### 1. Reuse the complete cart busy predicate and add scoped failure evidence

Keep `cart/isCartBusy`, derived from `getIsAdding || IS_CART_SYNCING || isTotalsSettling || IS_COUPON_PROCESSING`, and `waitForIdle`'s separate connection waits unchanged. Extend `cart/canStartExpressCheckout` to require valid `getPaymentTotals`, `!isCartBusy`, no failed latest refresh, and no quantity difference from the last applied item totals. Existing busy state continues covering item writes and coupon processing before methods/totals start.

Expose the quantity comparison as `cart/hasPendingQuantityChange`: match each current cart item to `itemsAfterPlatformTotals` by `server_item_id` and compare its current `qty` with the applied item's `qty`. A missing matching applied item is not evidence that its quantity is ready, so it also blocks express payment. With no payment totals, the existing missing-totals gate already prevents payment and the normal totals retry remains available. Quote reset already clears the applied item map.

The quantity mutation changes this derived getter immediately, before the debounce fires. The input timer, write flow and existing busy flags stay unchanged. When matching item quantities are applied, that difference disappears, but the busy/failure checks still control availability. A return to an already-applied quantity needs no additional pending-edit flag. Do not add this comparison to `isCartBusy` or `waitForIdle`: it is payment readiness, not a new asynchronous operation to wait on.

Do not use `isCartHashChanged` as a substitute. Although quantity affects that hash and asynchronous catalog/totals metadata are excluded, `stockSync` can stamp the hash with an unsent quantity. The item totals snapshot changes only when totals are applied, so that acknowledgement cannot bypass the quantity gate. No new state, acknowledgement protocol or storage is needed.

Keep the transient Boolean failure field and getter, initialized false. Do not change `getPaymentTotals`, clear last-known platform totals, or reset the successful-sync timestamp on failure. A quantity difference may remain after the item write succeeds but totals fail; it must keep payment blocked without disabling the recovery action.

The totals producer owns the flag:

- A real refresh occupies the existing full busy span before its first methods await. Starting another attempt does not by itself clear an earlier failure.
- Only successfully applying usable totals for the active quote and current refresh clears the failure flag, alongside the existing totals/success evidence commits.
- Validate payment usability with the existing monetary/currency criteria before replacing earlier successful totals; an unusable response must not erase the analytics fallback. Reuse those criteria rather than introducing an independent response-schema subsystem.
- A rejected chain, non-success result or unusable totals response marks that current refresh failed. Keep existing rejection/logging behavior rather than adding another notification layer.
- A chain that resolves without requesting totals leaves the previous failure state and totals unchanged, even if it held the totals busy span. This explicitly includes `isTotalsSyncNeeded()` becoming false after `pullMethods` and a missing `shippingMethodsData.country`. Release its busy hold as usual; do not count either exit as successful recovery, manufacture a failure, or introduce an extra retry. Earlier usable/nonfailed totals remain eligible after busy work settles only when they also represent the current quantities.
- An ordinary refresh skipped before the busy span has the same unchanged-outcome policy. Superseded/replaced-quote work also cannot update failure evidence, regardless of whether it requested totals.
- Quote replacement and explicit totals reset clear the transient failure evidence together with that quote's totals. Valid totals are still required for the replacement quote.

Use the existing `totalsRefreshId` ownership mechanism for failure as well as result application. Allocate ownership at the start of a real `syncTotals` chain, before methods preparation, and carry it into its nested `overrideServerTotals`; a direct `overrideServerTotals` call allocates its own ownership. Do not allocate a second identity for the same chain. Retain the ownership check immediately before `getTotals`, with no intervening await: an already-superseded or replaced-quote chain must return without issuing a totals request or shipping-info POST. Retain the response-time check for work that becomes obsolete while in flight. A late result or rejection may update neither totals nor failure evidence after a newer chain started or the quote changed. Preserve the existing current-quote cart-not-found clearing/reconnect behavior and busy-hold cleanup on the early return.

**Cost:** Reusing the existing busy signals, applied item quantities, totals span and sequencing is rung 2; the failure flag, sequencing extension and small derived getters are rung 4. Immediate quantity blocking needs the comparison because the busy predicate starts too late; failed-refresh blocking needs the existing failure evidence because an idle cart can retain stale totals. Do not introduce a separate state machine or storage layer (rung 5).

### 2. Keep the button instances and layout; disable the interaction surface

In `express-checkout-buttons.vue`, retain the existing `hasPaymentTotals` visibility rule, so the established no-totals retry remains unchanged. When totals exist but the readiness getter is false, keep `_buttons` and its children mounted and visible, with the same size, spacing and ordering.

Apply the theme's disabled visual treatment to that wrapper without adding copy or a spinner. Mark the region unavailable with `aria-disabled` and prevent focus/pointer interaction with the `inert` attribute while blocked; remove `inert` entirely when ready rather than rendering `inert="false"`. The wrapper covers PayPal's iframe and SDK-created Google controls without traversing child refs or private SDK DOM. It becomes interactive again reactively when the getter changes. The store/SDK guard below remains authoritative; visual treatment alone is not a payment guarantee.

`PaymentAmazonPay` is also inside `_buttons`. If configured, it receives the same inactive styling and interaction block, including during failed-refresh recovery. This is the intentional shared-wrapper effect, not a new Amazon SDK integration or wallet-boundary check.

**Cost:** A small wrapper change is rung 4 and avoids changing four SDK rendering lifecycles. Hiding, unmounting or re-rendering buttons would lose the approved stable presentation and can repeat SDK initialization. An overlay or `pointer-events` alone would miss keyboard activation and previously registered callbacks.

### 3. Check the same policy once at each wallet's initiation

Expose a shared computed readiness check through the existing `PaymentMethod` mixin: ordinary payment remains allowed by its current behavior; express initiation requires `cart/canStartExpressCheckout`. The wallet entry points consume that check rather than recreating store policy or accepting a possibly stale parent prop.

- **PayPal / Pay Later:** Check in the supported SDK `onClick` callback and use `actions.reject()` to stop blocked activation quietly. Both funding sources use this integration. Keep `onPayPalCreateOrder` and `onPayPalError` unchanged: no duplicate `createOrder` check, rejection sentinel or extra error-suppression code is needed.
- **Apple Pay:** Return before payment-request/session creation, `session.begin()` and `payment-started` if express initiation is blocked.
- **Google Pay:** Check at the start of `doPayment`, before `payment-started` and payment-request preparation. Leave the existing amount read and request flow unchanged. Client-backed request construction is synchronous; the current `await` adds only a microtask, not a shopper-reachable methods/totals delay. Do not add a second check or re-read/overwrite the amount.

No entry point awaits readiness, remembers a click, schedules a retry or opens a wallet when the store later becomes ready. Amounts and currency continue using their existing sources; the producer has applied the new grand-total segment before the busy span releases. Checks run only on initiation, not on the shipping callbacks of an existing session. Existing final-submission validation remains unchanged.

**Cost:** Supported SDK click validation and one small check per wallet are rungs 3–4. The quantity gate rejects PayPal/Pay Later activation when an edit is already pending, so its later debounce cannot start between an accepted click and payment creation. A new edit made only after PayPal/Pay Later has accepted the click is explicitly outside this guarantee; do not add a `createOrder` recheck or suppression code for that case. Google's client-backed request construction remains synchronous. Building an alternate button implementation or patching an SDK is unnecessary.

### 4. Extend the existing retry with an opt-in express context

Give `checkout-totals-retry.vue` an express context option that defaults off. Its standard-checkout behavior remains exactly as it is. In express context, show/allow its existing retry for missing payment totals **or** a failed latest totals refresh, including when old totals remain.

Use the existing forced `cart/syncTotals` action and text. In express context disable/reject retry while `isCartBusy` or its own request is active, not merely during the totals HTTP request. This prevents another manual click during cart writes, coupon processing or methods preparation. Keep the error/retry available if the attempt fails again; a successful business refresh clears the store failure evidence and removes the error without reloading. Do not add an extra notification for a blocked wallet activation or a retained-totals retry failure.

Do not add `hasPendingQuantityChange` or `!canStartExpressCheckout` to the retry's disabled/early-return condition. A difference from the applied snapshot does not distinguish an unsent edit from a successfully written quantity whose totals refresh failed. Blocking retry on that difference would prevent the required recovery. While the retry is shown, an additional unsent edit therefore does not add a retry block; an unsent edit alone does not show the retry (see Risks for a quantity that is never sent); missing-baseline and retained-totals failures keep the existing retry policy. A successful retry applies matching quantities and totals and can restore payment readiness normally.

Buttons with retained totals remain visible and inactive beside the recovery UI. No-totals behavior can continue hiding the button group as before. Ordinary initial refresh with retained totals shows only the inactive buttons, not a new error message.

**Cost:** Reusing the component/action is rung 2 with a small opt-in adaptation at rung 4. Changing the default retry policy would unintentionally widen standard checkout's scope; a second retry component would duplicate behavior and copy.

### 5. Extend existing focused regression suites

- Store tests exercise real actions, mutations and getters with deferred item writes, coupon requests, methods and totals responses. Cover readiness from the local quantity mutation, through its unchanged debounce, sending the edit and applying totals. Cover hash acknowledgement while a quantity remains unmatched, realistic applied-item fixtures, failure with retained quantities, no-request exits, missing baselines, recovery, latest-refresh ordering and quote replacement. Retain `waitForIdle` behavior and analytics' same-quote fallback assertions. Preserve regressions proving obsolete work issues no shipping-info request before busy cleanup.
- Theme tests extend `express-checkout-buttons.spec.ts` for visible/inactive/active transitions during the unsent quantity interval, unchanged no-totals behavior, shared-wrapper treatment of configured Amazon Pay and no automatic activation. Cover the retry component in both its default and express contexts: quantity mismatch alone must not disable it, and a successful write followed by totals failure must remain manually recoverable.
- Payment entry-point tests mock the public wallet SDK methods, not private SDK internals. Assert blocked click initiation makes no payment request/session opening or `payment-started`, then a fresh allowed click uses the updated initial amount. Cover both PayPal funding sources and unchanged non-express behavior. Model Google's client-backed request builder synchronously; do not add deferred-preparation or duplicate-check tests.
- Inspect the actual rendered cart at desktop and mobile widths immediately after changing quantity and with delayed cart writes, coupon requests and methods/totals responses, including keyboard focus and PayPal's iframe. Check the shared presentation in the four applicable brand variants; unsupported wallet/device eligibility remains unchanged.

Core tests are not included in maintained CI. Run/report relevant `yarn test:unit:core` tests as well as the maintained theme/payment suites, lint and type checking.

## Risks / Trade-offs

- **Transient failure state across navigation** → Keep it in cart Vuex, not a cart-component ref, so remounting cannot unlock retained totals. No new persistence is needed: restored sessions still follow existing totals restoration/business refresh behavior.
- **A late request changes readiness for the wrong operation** → Apply the existing current-quote/latest-refresh ownership to failure evidence as well as success, including the methods portion of the chain.
- **A third-party control retains focus or invokes its click callback** → Use `inert` for interaction and the same live getter at click initiation; test keyboard interaction in the rendered UI.
- **Shared retry changes standard checkout or becomes permanently disabled after a quantity write** → Keep the default policy unchanged and do not apply the quantity/payment-readiness gate to the retry. Cover a written quantity with failed totals and a missing initial snapshot.
- **A hash acknowledgement hides an unsent quantity change** → Compare current quantities with applied item totals, not the mutable cart-hash baseline. Keep the original debounce and write flow; no new flush, timer or pending-edit state is added.
- **A changed quantity never reaches the server** → Accepted risk. When the cart write fails (it logs the error, keeps the local quantity and starts no totals refresh), the shopper leaves the cart within the input's delay (unmounting cancels the debounced sync), or a coupon is applied or removed within that delay (the coupon flow applies totals for the server's quantity and then stamps the cart hash with the unsent local quantity, so the debounced sync finds no change and sends nothing), the quantity still differs from the applied item totals while nothing is busy and no refresh has failed. The express buttons stay visible and inactive with no message, and the totals retry stays hidden because it is shown only for missing totals or a failed refresh. The next cart synchronization, from another cart edit or a page reload, applies matching totals and restores them; standard checkout stays available. No on-page recovery, message or retry trigger is added for this state, and the coupon flow's hash stamping stays unchanged; the lost coupon-time write predates this change, and the wallet amount is never the unsent one.
- **A new edit begins after PayPal/Pay Later accepted a click** → Accepted scope limit: the click is not revoked and `createOrder` is not rechecked. The new quantity rule covers edits already pending at activation, not edits begun afterwards.
- **Upstream totals lack a grand-total segment despite passing the existing totals checks** → Leave the existing upstream shape contract and wallet amount access unchanged; no extra grand-total-line validation or amount rewrite is introduced.
- **A no-country configuration or a no-longer-needed refresh applies no totals** → Preserve its earlier totals/failure outcome, rather than treating an internal configuration-only or no-op exit as an external failure. A prior failed refresh stays blocked until a real success. This change does not validate or repair configuration.
- **Device-limited wallet verification** → SDK-boundary tests cover all four choices; actual Apple Pay rendering/session checks require an eligible Apple device/browser. Do not replace eligibility rules merely to show a button in a test browser.

## Migration Plan

No data migration or new configuration is required. Ship the application getter/lifecycle changes, theme presentation/retry changes and payment module guards as one compatible storefront release for the affected brand variants. Revert these source changes together if rollback is needed; no stored state needs conversion.
