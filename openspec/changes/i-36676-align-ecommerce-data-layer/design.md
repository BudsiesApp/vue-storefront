# Design

## Context

See `proposal.md` for motivation. `EventBusListener.ts` creates all required events, and `track-ecommerce-event.factory.ts` clears `ecommerce` before each push. The pricing and email corrections below are already implemented on this branch; the readiness refactor retains them. Relevant constraints:

- Cart items carry Magento's `extension_attributes.budsies_quote_item_totals` per unit: `regular_price` is the base product price without custom options; `final_price` is the paid price after item discounts; `savings_amount` is the paid price before discounts minus the base price; and `discount_amount` is the negative coupon discount. `PriceHelper.getCartItemPrice` treats `regular_price` as the undiscounted price, so a paid surcharge yields a special price above the regular price, which `getFinalPrice` caps.
- `overrideServerTotals` now merges `budsies_quote_item_totals` along with item totals and quantity, correcting stale cart-pull prices after coupon changes. Magento returns `budsies_quote_item_totals` on every totals response item (budsies-store-m2#458).
- The `afterAddToCart` hook receives the product before cart preparation, without server item totals. `addItems` awaits the sync that copies server item totals onto the store line, but not the later product-data reload that restores the line's categories. `remove_from_cart` already receives the store cart line.
- Bundle/product pricing corrections preserve zero campaign prices and selection quantities in displayed prices and cart items without item totals. Product fields come from the API's server-side tax calculation: an unset or expired special price has `special_price: null` and `special_price_incl_tax: 0`, while an active zero special price also sets `price_incl_tax` to 0.
- `platformTotals` is not restored on page load. The existing event composables wait for a successful timestamp and an unchanged cart hash, so failures can suppress a visit's event indefinitely. `cartIsLoaded` becomes true before token/hash restoration, and `connect` starts synchronization only after awaiting a quote token. Neither flag proves startup or a connection has settled.
- Checkout's asynchronous `beforeMount` awaits payment details before starting its forced totals refresh. Vue does not await that lifecycle hook before mounting. The cart line's one-second quantity debounce is cancelled on unmount, so a totals-only request on checkout can overwrite an unsent local quantity.
- Product documents store their categories as `{category_id, name, position}` only, without a path or parent; the ID paths exist only on category documents, which item mapping does not load.
- After a cart merge, totals and product-data refreshes run in parallel. The current branch already excludes catalog fields and item totals from the synchronization hash and protects totals application against overlapping requests and replaced quotes. These protections remain even though analytics stops using the hash.
- The three customer-email call sites now share normalized SHA-256 and legacy raw SHA3-256 mapping, with explicit clearing for blank emails.

## Goals / Non-Goals

**Goals:** Correct item-level fields and email hashes; use explicit operation completion for cart/checkout event timing; reuse backend item totals and existing event value sources; allow bounded, same-quote best-effort reporting after an actual failure.

**Non-Goals:** Changing event `value` or `currency` sources when totals exist; a new analytics service, parallel Data Layers, or new event types; a discount engine; checkout/order snapshot infrastructure; backend changes; broad listener refactoring; display-pricing changes beyond Decisions 3 and 4. Preserve the configured GTM script source from #36478. Do not change category mapping or purchase `custom_fields` rounding in this refactor. Do not fix other pre-existing quantity/coupon races or rejected-add rollback behavior; only Add-state cleanup and checkout's pending-edit flush are dependencies here.

## Decisions

### Data Layer field changes

Paths are relative to each pushed event; `items[]` means every emitted item.

| Event(s) | Data Layer path | Current payload | Required payload |
| --- | --- | --- | --- |
| All ecommerce events with `items` | `items[].price` | Product display price or cart display line price divided by quantity | Numeric, tax-exclusive, discounted unit price. Cart/order items: `getFinalPrice(getCartItemPrice(item))` divided by the normalized quantity, using refreshed item totals (Decision 3). `add_to_cart`: the synchronized line (Decision 5). Products: tax-exclusive product mapping. Coupons are never subtracted twice. |
| All ecommerce events with `items` | `items[].discount` | `{ discount, discountPercent }` | Numeric per-unit monetary discount, or `0`. |
| Cart/order events | `items[].quantity` | Raw item `qty` | Normalized quantity (Decision 2). |
| All ecommerce events with `items` | `items[].item_category` | One pipe-joined string | First named assigned category; no further levels (Decision 6). |
| `view_cart` | `ecommerce.coupon` | Absent | Applied current-quote `platformTotals.coupon_code`, when available; absent for an empty cart or without usable quote totals. |
| `view_cart`, standard `begin_checkout` | event timing | Hash/timestamp readiness gate | Emitted once after real operation boundaries and at most one missing-totals attempt; same-quote fallback after failure (Decision 7). |
| Customer-identifying pushes | `customerEmailHashed`, `customerEmailHashedSha3` | SHA3-256 of the raw email in `customerEmailHashed`, also for blank emails | SHA-256 of the normalized email, and SHA3-256 of the raw email; both set to undefined when blank (Decision 8). |

Unchanged: `ecommerce.value` and `ecommerce.currency` (grand total with quote/order currency for cart, checkout, and purchase; product or line price for item events), purchase `shipping`, `tax`, `transaction_id`, and `coupon`, event names, `shipping_tier`, `payment_type`, `item_id`, `item_internal_id`, `item_variant`, `purchase_flow`, integration custom fields, and the `ecommerce: null` push before each ecommerce event.

### 1. Correct the existing item helpers and keep value sources

Keep the current listener and helper structure. Reuse `PriceHelper.getCartItemPrice(cartItem, productDiscountedPrice)` for cart and placed-order items, and map its line amounts to unit `price` and numeric unit `discount` with `getFinalPrice` and `getProductDiscount`. Calling it on the supplied item avoids resolving a placed order's price from a cached current-cart item.

Keep product tax-exclusive mapping separate. Resolve catalog unit amounts from `PriceHelper.getProductPriceData` with the default-bundle calculation and `getProductDiscountedPrice`, not the cached `GET_PRODUCT_PRICE` getter. Remove tax once using the matching current and original net/gross pairs, falling back to the available pair. Retain gift-card amounts and default bundle/campaign resolution, honor zero-valued overrides, and ignore product quantity during unit-price resolution.

Restore the previous `value` and `currency` expressions in each handler. Item revenue is not reconciled with `value`. Round the purchase `custom_fields.subtotal_value` and `affiliate_total` to cents; both are subtractions of order totals and otherwise carry floating-point noise.

### 2. Normalize cart item quantity once

Parse the item quantity once: a finite positive number, including a numeric string, is used for both the reported `quantity` and the unit-amount division. Any other value reports `quantity: 1`, the same default the cart uses for a missing quantity (`CART_ADD_ITEM`, `getCartItemPrice`). Product events report a finite positive quantity, including a numeric string, and otherwise `1`. One helper normalizes quantities for both mappers. Unit amounts that are not finite, or not positive, are reported as 0, so invalid custom totals or catalog prices never emit NaN or Infinity.

Round unit `price` and `discount` to four decimal places, the precision of Magento's item totals, in both the cart and product mappers. This removes floating-point noise from divisions and subtractions without losing allocated coupon precision.

### 3. Refresh and interpret cart item totals

In `overrideServerTotals`, merge a response item's `extension_attributes.budsies_quote_item_totals` into its matching line's existing attributes with `createTotalsItemUpdate`. Commit the prepared line changes synchronously with totals and the sync timestamp, rather than awaiting `updateItem` (Decision 7). Merging matters because plushie, flow, and customization data share that object. When item totals are absent, leave the item's attributes unchanged. Coupon apply and removal both pass through this action.

In `getCartItemPrice`, with custom totals: regular = (`regular_price` + max(0, `savings_amount`)) × qty; special = `final_price` × qty when below the regular price, otherwise `null`. When `savings_amount` is absent, regular = max(`regular_price`, `final_price`) × qty. For `savings_amount` ≤ 0, the result equals the previous calculation. Add `savings_amount` and `discount_amount` to the item-totals type.

Alternatives rejected: deriving unit prices from `row_total` and `discount_amount` (duplicates Magento's calculation; `row_total_with_discount` is 0); fixing only the GTM mapper (leaves the cart display wrong).

Totals are usable only when they carry both `regular_price` and `final_price` (`hasCartItemTotals`). The server totals are tax-exclusive, but the fallback of `getCartItemPrice` reads the tax-inclusive product fields, so the GTM cart mapper does not use that fallback: for a cart or order item without usable totals it prices the item with `prepareCartLinePrice`, which removes tax once with the item's own net/gross pairs and honors the selected bundle options (Decision 5). `add_to_cart` needs no separate fallback because it goes through the same mapper.

### 4. Keep zero and quantity in bundle campaign prices

In `getBundleOptionDiscountedPrice`, resolve each child's campaign final and regular price with finite-number checks instead of `||`, and multiply by the selection's `qty`; a missing, zero, negative, or non-numeric quantity counts as 1, the default `getDefaultBundleOptions` uses. Keep the product-field fallback (`special_price_incl_tax`, then the current price): `special_price_incl_tax` is 0 both for an unset and for a real zero special price, and a real zero special price also makes the current price 0, so the fallback already resolves both cases correctly. The core helper also corrects displayed prices for the affected bundles. In `getProductPrice`, treat any finite campaign final price, including 0, as present (`??` and `!== undefined` instead of `||` and `!!`); missing or non-numeric campaign prices keep the existing resolution, so only zero-priced campaign products display differently. Alternative rejected: a GTM-only copy duplicates logic and leaves displayed prices wrong.

### 5. Map `add_to_cart` from the synchronized line

When the existing `afterAddToCart` hook runs, immediately map the matching store line as updated by the item-write response, with the action quantity and the added product's categories. Keep the cart item price getter of the added product as the source of `value`. If no line or no usable item totals exist, use the existing local, tax-exclusive product fallback with the selected bundle options (Decision 3). Product and listing events keep the default bundle options; `remove_from_cart` keeps mapping the line it receives. The hook can also run for a rejected Add, so keep `isAddToCartRejected`: a failed server response or an error notification suppresses the event, but a warning alone does not.

For an existing quote, `addItems` waits for its item write but only waits for the follow-on refresh when retrying a pending coupon, as before. First-quote creation keeps its existing synchronization. The listener does not wait for idle or for totals. A later background methods or totals failure is not a result of Add. A later cart-lost 404 can still clear that cart, so the shopper can see “added” and then an empty cart. That is the existing background-refresh behavior; do not propagate that 404 into the Add diff log or try to retract the event.

A failed cart read at the start of synchronization (`performSync`) is not an item rejection, except when the cart is missing. For a 500, 503, or missing result code, keep the local change for later synchronization, log the failure, and return an empty diff log: no add error, and `add_to_cart` is still reported. Do not introduce rollback or report that retained change as rejected.

A cart-lost 404 on the initial cart read still clears the local change and reports a friendly translated error from the diff log, with no `add_to_cart`. A retry after the cleared cart starts with the added quantity once. Reset `CART_ADDING_ITEM` in `finally` so readiness and the Add button cannot remain busy after the operation settles.

Alternatives rejected: rolling back several products on a temporary read failure (can lose a concurrent edit), or checking only for a matching line to detect rejected adds (misses quantity increases and unsynchronized lines).

### 6. Report one category level

Report the first named category of the product as `item_category` and no further levels. Product data has no category paths, so a hierarchy cannot be verified without loading category documents. Cart items rely on the categories that cart synchronization restores; `add_to_cart` uses the added product's categories.

Alternatives rejected: deriving ancestry from path segments matched against slugs (product data has no paths, and slug matching accepts unrelated categories); building the hierarchy from categories loaded in the store (none are loaded on product and cart pages); loading categories by ID while mapping items (an extra request that delays item events).

### 7. Cart and checkout analytics wait independently of the shopper

#### Owned by each visit, with bounded work

Replace the previous readiness composables with one cart-view composable and a checkout-mounted handler. Checkout owns its entry promise on the component, not in Vuex. Read current items and usable totals at emission, not when mounting.

The sequence is:

1. On the client after mount, await cart startup settlement and, for checkout, the actual entry operation.
2. Await any active connection/pull and the existing cart/totals/coupon work, including the add operation (`getIsAdding`). Settlement includes rejection; it is not proof of success. Recheck after an await so newly active work is not mistaken for idle. The existing Add flag is a boolean: if Adds overlap, the first to finish can clear it before the second settles.
3. If checkout's entry has not already attempted its refresh, the visit can dispatch `cart/fetchMissingTotals`. That action makes one read-only totals request only for a nonempty eligible cart without successfully applied totals for its current quote. It does not fetch shipping/payment methods, change their selection, or set shopper-facing busy flags. Await it and any remaining active work before reporting.
4. Emit once while the visit is still mounted and eligible. On failure use same-quote last-known totals if present; otherwise map local items and omit unavailable event-level monetary data. An empty cart emits `items: []` without `value` or `coupon`, even if the store retained previous totals. Keep existing currency sources/defaults; do not synthesize a grand total from items or set a missing value to zero.

There is no timer, retry loop, raw hash comparison, or `isTotalsSyncRequired` analytics gate. Offline, disabled, or disconnected carts make no analytics totals request. Unmount suppresses later dispatch/emission for that visit; it does not abort shared cart requests. A new visit can make its own attempt; later login after a genuinely empty emitted view does not add another event to that visit. Express checkout retains its existing trigger.

#### Cart-owned operation boundaries

Expose startup completion from cart core, not a theme approximation of `cartIsLoaded`. It spans item restoration, pending coupon/token/hash restoration, and the initial session-driven connect/pull. `core/modules/user/store/actions.ts` currently schedules that last part through `sessionAfterStarted`, sometimes from `LOCAL_CART_DATA_LOADED_EVENT`; include that scheduling gap in the boundary. Resolve the settlement signal in `finally` on success or failure. Do not change the meaning or ordering of the existing local-data-loaded event, and do not make the initial connection wait on its own startup signal.

Expose active connection settlement from its start, before `getCartToken`, through its pull/merge, including login/guest-to-customer connection and deferred reconnect. Reuse existing promises and the cart sync wait where possible, with only the minimal store-scoped completion plumbing needed for the pre-sync gaps. Register pending work synchronously before its first await, release it in `finally`, and keep it per application/store, not process-global on SSR. The composable consumes these boundaries; it does not reproduce initialization, quote creation, or navigation state machines with more inferred flags.

#### Checkout sends edits, then supplies its existing refresh

Create the component-local checkout entry promise synchronously in `beforeMount`. Direct server-rendered checkout redirects to the cart; in-app entry does not wait for startup or idle before starting payment/method preparation. Only the mounted analytics handler waits for entry and active cart work. An empty checkout redirects and returns before payment/method preparation; an ended or success visit does not emit.

On a changed, connected cart, reuse `cart/sync` with `forceClientState` to send local edits, waiting for item writes and any pending coupon application but skipping their intermediate methods/totals refresh. On an unchanged cart, skip the sync entirely. Then prepare payment and run the existing forced methods/totals chain once. Store the merged item hash before background totals work so an already accepted Add is not mistaken for an unsent edit. Do not reload cached items or introduce a pending-edit registry.

Await the actual refresh dispatch in the entry promise. Keep the shipping-method notification without firing a second refresh from that notification. If entry attempts its refresh, analytics never retries it. If entry fails before attempting it, the mounted handler can still make its one eligible read-only request. Recheck the `success` route and mounted state before emitting.

#### Totals ownership and cart correctness remain in core

At the quote-token mutation and explicit cart-clear boundary, invalidate previous quote totals and their successful timestamp when the quote changes or is cleared. Clear quote-owned totals/segments so ordinary readers cannot reuse quote A's value/coupon for quote B; do not invalidate when the same token is committed again. A nonzero timestamp is usable evidence only under that ownership invariant. Do not restore it from storage or infer ownership from a cart hash.

Remove `resetTotalsSyncOnError` and failure-driven `CART_RESET_TOTALS_SYNC` uses. A rejected request, non-404 error, malformed/unusable response, or methods-pull failure keeps the last successfully applied totals of the same quote. It must not mark new totals successful or strand a busy hold. Retain an invalidation mutation only if needed for quote replacement/clear; remove the old failure-reset mutation if unused. Ordinary synchronization no longer gets an automatic retry from failure invalidation: the event flow's bounded attempt is explicit, not a guarantee of later successful recovery.

Keep `totalsSyncDepth` across methods, the totals request, and response application; release in `finally` and expose it to analytics as `isTotalsSettling`. The shopper's `IS_TOTALS_SYNCING` only covers business totals requests as on the base branch; Place Order also retains its existing shipping, payment, and coupon checks. Keep `totalsRefreshId` and token checks. Only the latest-started refresh may apply a successful response; a 404 for a replaced quote must not clear the current one, while a 404 for the same quote still clears it regardless of refresh generation. Keep response application synchronous.

Keep `clear`'s deferred reconnect after `waitForCartSync` when called from an active sync, without awaiting that reconnect inside its own predecessor. Include that deferred operation in connection settlement so analytics does not report through its scheduling gap.

Keep the `calcItemsHmac` exclusions for stock, totals, and catalog hydration (except SKU); exclude both `budsies_quote_item_totals` and `estimated_shipment` from extension attributes. Checkout uses the hash to identify edits to send, so shipping metadata must not create a false flush. Quantity, SKU, options, and other extension attributes remain hash-relevant. Analytics does not use this hash.

#### Cost and coverage

This is a small extension around existing Vuex actions/promises and Vue lifecycle hooks (cost rungs 2–4), not a new readiness subsystem. Retaining the established busy/response guards costs less than replacing cart correctness with theme inference. Rejected alternatives: idle-only predicates (miss startup and checkout-entry gaps), timestamps without quote invalidation (reuse another quote), hash-driven readiness plus recovery retries (more coupling and lost events), and serialized totals queues or snapshot infrastructure (unnecessary ownership/maintenance).

Keep focused maintained tests for the real catalog/merge path, cart startup and empty-cache login, busy boundaries, quote ownership and late responses, and checkout entry/cancellation. Exercise the immediate Add event against the actual item-write path while methods are still pending. No duplicate tests for removed behavior.

### 8. Customer email hashes

Add `js-sha256` and one helper that returns both digests for a nonblank email: SHA-256 of `email.trim().toLowerCase()` and SHA3-256 (`js-sha3`) of the raw email. For a blank email, it returns both keys set to `undefined`; GTM's data model keeps values from earlier pushes, and an `undefined` value clears them, so a blank email, including the cleared customer data after logout, removes earlier hashes. Use it at the wizard override, the purchase push (order email), and `getCustomerEventData()`. Keep `js-sha3` for the existing SHA3-224 uses.

## Risks / Trade-offs

- Shared pricing helper changes affect displayed prices → output is unchanged unless `savings_amount` > 0 or a bundle campaign child is zero-priced or has a selection quantity above one; cover each case with regression tests.
- Paid option combined with a sale price → Magento merges both into `savings_amount`, so the paid price is correct but the regular price and discount omit the sale part.
- Paid-option items → the order summary's regular subtotal and savings come from Magento totals based on base prices and stay inconsistent with the corrected line price.
- `customerEmailHashed` changes value → `customerEmailHashedSha3` carries the previous digest for consumers that need it.
- Shared `discount` and category semantics change for non-GA consumers → document the before/after shapes.
- The cart hash covers fewer fields → after deployment, stored cart hashes no longer match once, causing one extra cart synchronization per visitor.
- A methods/totals failure after an accepted Add does not reject it, and an expired quote may clear after the Add was reported. A write response without usable line amounts falls back to local pricing; the storefront cannot detect an amount that the server sends as usable but stale.
- A failed refresh can report an earlier coupon/value and item prices → accepted only for last-known totals of the same quote after real operations settle. Successful requests must still report their applied result. Supplied 30-day failure counts were 29 of about 45,000 shipping-information requests and 7 of about 1,100 totals requests, concentrated on about 17 carts; these support best-effort failure reporting, not ignoring lifecycle races.
- No current-quote totals after the bounded attempt → report local items without an invented event value/coupon; no analytics retry loop. Offline/disabled/disconnected carts use local data without a request.
- The shopper leaves before readiness → that visit has no event; do not emit on a later page.
- Categories remain one level and purchase custom-field rounding stays in place → release approval for those existing choices remains separate; this refactor does not resolve it.
- Quantity changes during coupon processing and other unrelated cart/rejected-add races → accepted outside this scope. Only exception-safe Add cleanup and sending edits before checkout are included.

## Migration Plan

1. Run focused mapper, listener, cart action, price helper, and composable tests, changed-file lint, type checking, and strict OpenSpec validation.
2. Prepare before/after examples for discount, category, coupon, and email-hash fields, retaining value/currency sources while documenting empty/no-totals omissions and same-quote failure fallback.
3. Verify purchase fields in GA4 DebugView; keep this check pending until evidence exists.
4. Record DebugView results in the final Redmine notes.

## References

- [GA4 purchase parameters](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#purchase)
- [GA4 ecommerce implementation](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [GA4 discount handling](https://developers.google.com/analytics/devguides/collection/ga4/apply-discount)
