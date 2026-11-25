# Design

## Context

On `petsies-theme`, `EventBusListener.ts` creates the ecommerce events and `track-ecommerce-event.factory.ts` clears `ecommerce` before each push. This change updates that tracking path without adding events. Relevant constraints:

- Cart items carry Magento's `extension_attributes.budsies_quote_item_totals` per unit: `regular_price` is the base product price without custom options; `final_price` is the paid price after item discounts; `savings_amount` is the paid price before discounts minus the base price; and `discount_amount` is the negative coupon discount. `PriceHelper.getCartItemPrice` treats `regular_price` as the undiscounted price, so a paid surcharge yields a special price above the regular price, which `getFinalPrice` caps.
- `overrideServerTotals` already merges `budsies_quote_item_totals` along with item totals and quantity when recalculating after a coupon change. Magento includes this extension attribute on totals response items (budsies-store-m2#458).
- The `afterAddToCart` hook receives the product before cart preparation, without server item totals. `addItems` awaits the sync that copies server item totals onto the store line, but not the later product-data reload that restores the line's categories. `remove_from_cart` already receives the store cart line.
- Existing pricing helpers preserve zero campaign prices and bundle selection quantities. Product fields come from the API's server-side tax calculation: an unset or expired special price has `special_price: null` and `special_price_incl_tax: 0`, while an active zero special price also sets `price_incl_tax` to 0.
- `DetailedCart.vue` emits `view_cart` from its `isLoading` watcher; `Checkout.vue` emits `begin_checkout` in `beforeMount`. Both can fire before the relevant totals arrive. `platformTotals` is not restored from storage, `cartIsLoaded` becomes true before token/hash restoration, and `connect` awaits a quote token before synchronization starts.
- Checkout's asynchronous `beforeMount` awaits payment details before starting its forced totals refresh. Vue does not await that lifecycle hook before mounting. The cart line's one-second quantity debounce is cancelled on unmount, so a totals-only request on checkout can overwrite an unsent local quantity.
- Product documents store their categories as `{category_id, name, position}` only, without a path or parent; the ID paths exist only on category documents, which item mapping does not load.
- After a cart merge, totals and product-data refreshes can run in parallel; neither should make an already synchronized line look like a pending cart edit.

## Goals / Non-Goals

**Goals:** Correct item-level fields and email hashes; use explicit operation completion for cart/checkout event timing across Petsies, Budsies, Budsies Education, and Waggables; reuse backend item totals and existing event value sources; allow same-quote best-effort reporting after a business failure.

**Non-Goals:** Changing event `value` or `currency` sources when totals exist; a new analytics service, parallel Data Layers, or new event types; a discount engine; checkout/order snapshot infrastructure; backend changes; broad listener refactoring; display-pricing changes beyond paid-option pricing; Bulk Orders (separate app branch). Preserve the configured GTM script source from #36478. Existing cart races outside the Add-state cleanup and checkout pending-edit flush are out of scope.

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
| `view_cart`, standard `begin_checkout` | event timing | `isLoading` watcher on the cart; `beforeMount` on checkout | Emitted once after business operations settle; same-quote fallback after failure and no analytics refresh (Decision 7). |
| Customer-identifying pushes | `customerEmailHashed`, `customerEmailHashedSha3` | SHA3-256 of the raw email in `customerEmailHashed`, also for blank emails | SHA-256 of the normalized email, and SHA3-256 of the raw email; both set to undefined when blank (Decision 8). |

Unchanged: `ecommerce.value` and `ecommerce.currency` (grand total with quote/order currency for cart, checkout, and purchase; product or line price for item events), purchase `shipping`, `tax`, `transaction_id`, and `coupon`, event names, `shipping_tier`, `payment_type`, `item_id`, `item_internal_id`, `item_variant`, `purchase_flow`, integration custom fields, and the `ecommerce: null` push before each ecommerce event.

### 1. Correct the existing item helpers and keep value sources

Keep the current listener and helper structure. Reuse `PriceHelper.getCartItemPrice(cartItem, productDiscountedPrice)` for cart and placed-order items, and map its line amounts to unit `price` and numeric unit `discount` with `getFinalPrice` and `getProductDiscount`. Calling it on the supplied item avoids resolving a placed order's price from a cached current-cart item.

Keep product tax-exclusive mapping separate. Resolve catalog unit amounts from `PriceHelper.getProductPriceData` with the default-bundle calculation and `getProductDiscountedPrice`, not the cached `GET_PRODUCT_PRICE` getter. Remove tax once using the matching current and original net/gross pairs, falling back to the available pair. Retain gift-card amounts and default bundle/campaign resolution, honor zero-valued overrides, and ignore product quantity during unit-price resolution.

Keep the base `value` and `currency` expressions in each handler. Item revenue is not reconciled with `value`. Round the purchase `custom_fields.subtotal_value` and `affiliate_total` to cents; both are subtractions of order totals and otherwise carry floating-point noise.

### 2. Normalize cart item quantity once

Parse the item quantity once: a finite positive number, including a numeric string, is used for both the reported `quantity` and the unit-amount division. Any other value reports `quantity: 1`, the same default the cart uses for a missing quantity (`CART_ADD_ITEM`, `getCartItemPrice`). Product events report a finite positive quantity, including a numeric string, and otherwise `1`. One helper normalizes quantities for both mappers. Unit amounts that are not finite, or not positive, are reported as 0, so invalid custom totals or catalog prices never emit NaN or Infinity.

Round unit `price` and `discount` to four decimal places, the precision of Magento's item totals, in both the cart and product mappers. This removes floating-point noise from divisions and subtractions without losing allocated coupon precision.

### 3. Refresh and interpret cart item totals

In `overrideServerTotals`, merge a response item's `extension_attributes.budsies_quote_item_totals` into its matching line's existing attributes with `createTotalsItemUpdate`. Commit the prepared line changes synchronously with totals and the sync timestamp, rather than awaiting `updateItem` (Decision 7). Merging matters because plushie, flow, and customization data share that object. When item totals are absent, leave the item's attributes unchanged. Coupon apply and removal both pass through this action.

In `getCartItemPrice`, with custom totals: regular = (`regular_price` + max(0, `savings_amount`)) × qty; special = `final_price` × qty when below the regular price, otherwise `null`. When `savings_amount` is absent, regular = max(`regular_price`, `final_price`) × qty. For `savings_amount` ≤ 0, the result equals the previous calculation. Add `savings_amount` and `discount_amount` to the item-totals type.

Alternatives rejected: deriving unit prices from `row_total` and `discount_amount` (duplicates Magento's calculation; `row_total_with_discount` is 0); fixing only the GTM mapper (leaves the cart display wrong).

Totals are usable only when they carry both `regular_price` and `final_price` (`hasCartItemTotals`). The server totals are tax-exclusive, but the fallback of `getCartItemPrice` reads the tax-inclusive product fields, so the GTM cart mapper does not use that fallback: for a cart or order item without usable totals it prices the item with `prepareCartLinePrice`, which removes tax once with the item's own net/gross pairs and honors the selected bundle options (Decision 5). `add_to_cart` needs no separate fallback because it goes through the same mapper.

### 4. Preserve existing bundle campaign pricing

Reuse the base campaign price helpers: `getBundleOptionDiscountedPrice` multiplies child unit prices by the selected quantity and preserves a finite zero price; `getProductPrice` accepts a finite zero campaign final price. The tax-exclusive item fallback retains these behaviors without changing displayed campaign prices.

### 5. Map `add_to_cart` from the synchronized line

`mergeServerItem` marks imported lines with `source: 'server-import'` on `addItem`, which forwards it in the existing `afterAddToCart` hook. The GTM listener ignores that source before building the event. The hook and cart processing still run, with no additional requests. This covers startup, reconnect, ordinary sync, recovery, login, and the pull after Re-order. Tracking only the quantity actually added by Re-order is follow-up work; marking the pull as a shopper Add would also count unrelated lines. `forceServerSilence` remains independent because it controls server writes, not shopper intent.

When the existing `afterAddToCart` hook runs, match the added product to its cart line using cart identity and match a successful write in the diff log by server line ID. Use that write's amounts, the action quantity, and the added product's categories. Keep the cart item price getter of the added product as the source of `value`. If no matching write supplied usable amounts, ignore retained DTOs and use the local, tax-exclusive product fallback with the selected bundle options (Decision 3). Product and listing events keep the default bundle options; `remove_from_cart` keeps mapping the line it receives. Suppress the event when the hook's diff log reports a failed server response or an error notification; a warning alone does not suppress it.

For an existing quote, `addItems` waits for its item write but only waits for the follow-on refresh when retrying a pending coupon, as before. First-quote creation keeps its existing synchronization. The listener does not wait for idle or for totals. A later background methods or totals failure is not a result of Add. A later cart-lost 404 can still clear that cart, so the shopper can see “added” and then an empty cart. That is the existing background-refresh behavior; do not propagate that 404 into the Add diff log or try to retract the event.

A failed cart read at the start of synchronization (`performSync`) is not an item rejection, except when the cart is missing. For a 500, 503, or missing result code, keep the local change for later synchronization, log the failure, and return an empty diff log: no add error, and `add_to_cart` is still reported. Do not introduce rollback or report that retained change as rejected.

A cart-lost 404 on the initial cart read still clears the local change and reports a friendly translated error from the diff log, with no `add_to_cart`. A retry after the cleared cart starts with the added quantity once. Reset `CART_ADDING_ITEM` in `finally` so readiness and the Add button cannot remain busy after the operation settles.

Alternatives rejected: rolling back several products on a temporary read failure (can lose a concurrent edit), or checking only for a matching line to detect rejected adds (misses quantity increases and unsynchronized lines).

### 6. Report one category level

Report the first named category of the product as `item_category` and no further levels. Product data has no category paths, so a hierarchy cannot be verified without loading category documents. Cart items rely on the categories that cart synchronization restores; `add_to_cart` uses the added product's categories.

Alternatives rejected: deriving ancestry from path segments matched against slugs (product data has no paths, and slug matching accepts unrelated categories); building the hierarchy from categories loaded in the store (none are loaded on product and cart pages); loading categories by ID while mapping items (an extra request that delays item events).

### 7. Cart and checkout analytics wait independently of the shopper

#### Owned by each visit, observing business work only

In all four themes, move cart-view reporting from the `isLoading` watcher to a mounted composable. Move standard checkout reporting from `beforeMount` to a mounted handler that awaits the checkout component's entry promise. Read current items and usable totals at emission, not when mounting.

The sequence is:

1. On the client after mount, await cart startup settlement and, for checkout, the actual entry operation.
2. Await any active connection/pull and the existing cart/totals/coupon work, including the add operation (`getIsAdding`). Settlement includes rejection; it is not proof of success. Recheck after an await so newly active work is not mistaken for idle. The existing Add flag is a boolean: if Adds overlap, the first to finish can clear it before the second settles.
3. Emit once while the visit is still mounted and eligible. On failure use same-quote last-known totals if present; otherwise map local items and omit unavailable event-level monetary data. An empty cart emits `items: []` without `value` or `coupon`, even if the store retained previous totals. Keep existing currency sources/defaults; do not synthesize a grand total from items or set a missing value to zero.

Emission does not require a hash match or consult `isTotalsSyncRequired`. Analytics never requests totals, starts cart recovery, or retries a failed refresh. Unmount suppresses emission for that visit; it does not abort shared cart requests. Later login after a genuinely empty emitted view does not add another event to that visit. Express checkout retains its existing trigger.

#### Cart-owned operation boundaries

Expose startup completion from cart core, not a theme approximation of `cartIsLoaded`. It spans item restoration, pending coupon/token/hash restoration, and the initial session-driven connect/pull. `core/modules/user/store/actions.ts` currently schedules that last part through `sessionAfterStarted`, sometimes from `LOCAL_CART_DATA_LOADED_EVENT`; include that scheduling gap in the boundary. Resolve the settlement signal in `finally` on success or failure. Do not change the meaning or ordering of the existing local-data-loaded event, and do not make the initial connection wait on its own startup signal.

Expose active connection settlement from its start, before `getCartToken`, through its pull/merge, including login/guest-to-customer connection and deferred reconnect. Reuse existing promises and the cart sync wait where possible, with only the minimal store-scoped completion plumbing needed for the pre-sync gaps. Register pending work synchronously before its first await, release it in `finally`, and keep it per application/store, not process-global on SSR. The composable consumes these boundaries; it does not reproduce initialization, quote creation, or navigation state machines with more inferred flags.

#### Checkout sends edits, then supplies its existing refresh

Create the component-local checkout entry promise synchronously in `beforeMount`. Direct server-rendered checkout redirects to the cart; in-app entry does not wait for startup or idle before starting payment/method preparation. Only the mounted analytics handler waits for entry and active cart work. An empty checkout redirects and returns before payment/method preparation; an ended or success visit does not emit.

On a changed, connected cart, reuse `cart/sync` with `forceClientState` to send local edits, waiting for item writes and any pending coupon application but skipping their intermediate methods/totals refresh. On an unchanged cart, skip the sync entirely. Then prepare payment and run the existing forced methods/totals chain once. Store the merged item hash before background totals work so an already accepted Add is not mistaken for an unsent edit. Do not reload cached items or introduce a pending-edit registry.

Await the actual refresh dispatch in the entry promise. Keep the shipping-method notification without firing a second refresh from that notification. Recheck the `success` route and mounted state before emitting.

#### Totals ownership and cart correctness remain in core

At the quote-token mutation and explicit cart-clear boundary, invalidate previous quote totals and their successful timestamp when the quote changes or is cleared. Clear quote-owned totals/segments so ordinary readers cannot reuse quote A's value/coupon for quote B; do not invalidate when the same token is committed again. A nonzero timestamp is usable evidence only under that ownership invariant. Do not restore it from storage or infer ownership from a cart hash.

A rejected request, non-404 error, malformed/unusable response, or methods-pull failure keeps the last successfully applied totals of the same quote. Only quote replacement or clear invalidates that snapshot. A failed request neither marks new totals successful nor strands a busy hold.

After merging server and local items, decide whether to refresh totals using the resulting cart, not the pre-pull local items. This runs the existing business refresh and wait policy when a server cart populates an empty cache, so its coupon, discounts, and totals reach both the UI and analytics.

Track `totalsSyncDepth` across `syncTotals` and `overrideServerTotals`, including methods, requests, and response application; release in `finally` and expose it to analytics as `isTotalsSettling`. Keep the base timing of shopper-facing busy flags. Add refresh ID and token checks: only the latest-started refresh may apply a successful response; a 404 must not clear a replacement quote. A 404 from a business refresh for the same quote still clears it regardless of refresh generation. Apply responses synchronously.

Defer `clear`'s reconnect behind an active sync, without awaiting it from inside that predecessor. Include the deferred reconnect in connection settlement.

Extend the cart hash exclusions for stock and totals to cover catalog hydration (except SKU), `budsies_quote_item_totals`, and `estimated_shipment`. Checkout uses the hash to identify edits to send. Quantity, SKU, options, and other extension attributes remain hash-relevant.

#### Payment requires current-quote totals

Standard and express payment require successfully applied current-quote totals with finite order amounts and a currency (zero is valid). Missing totals disable the standard order action and hide wallet start controls. The shopper can request one normal totals refresh and retry payment. Check again before handing off or building the order; an express attempt with missing totals at final submission does not clear its nonce or session ID. These checks use only business state and do not wait for analytics.

#### Cost and coverage

Use existing Vuex actions/promises and Vue lifecycle hooks instead of a separate queue or snapshot store. An idle-only predicate misses startup and checkout-entry gaps, and a timestamp without quote invalidation can identify another quote's totals.

Cover the real catalog/merge path, a single business refresh after an empty-cache pull, same-quote/local reporting after failure without a second read, busy boundaries, quote ownership and late responses, and checkout entry/cancellation. Exercise immediate Add against the actual item-write path while methods are pending and an existing line whose write omits the amounts. Run the maintained suites with all four themes.

### 8. Customer email hashes

Add `js-sha256` and one helper that returns both digests for a nonblank email: SHA-256 of `email.trim().toLowerCase()` and SHA3-256 (`js-sha3`) of the raw email. For a blank email, it returns both keys set to `undefined`; GTM's data model keeps values from earlier pushes, and an `undefined` value clears them, so a blank email, including the cleared customer data after logout, removes earlier hashes. Use it at the wizard override, the purchase push (order email), and `getCustomerEventData()`. Keep `js-sha3` for the existing SHA3-224 uses.

## Risks / Trade-offs

- The shared cart pricing helper also corrects displayed prices for paid options. Existing bundle campaign display behavior is unchanged.
- Paid option combined with a sale price → Magento merges both into `savings_amount`, so the paid price is correct but the regular price and discount omit the sale part.
- Paid-option items → the order summary's regular subtotal and savings come from Magento totals based on base prices and stay inconsistent with the corrected line price.
- `customerEmailHashed` changes value → `customerEmailHashedSha3` carries the previous digest for consumers that need it.
- Shared `discount` and category semantics change for non-GA consumers → document the before/after shapes.
- The cart hash covers fewer fields → after deployment, stored cart hashes no longer match once, causing one extra cart synchronization per visitor.
- A methods/totals failure after an accepted Add does not reject it, and an expired quote may clear after the Add was reported. A write response without usable line amounts falls back to local pricing; the storefront cannot detect an amount that the server sends as usable but stale.
- A failed refresh can report an earlier coupon/value and item prices → accepted only for last-known totals of the same quote after real operations settle. Successful requests must still report their applied result. Supplied 30-day failure counts were 29 of about 45,000 shipping-information requests and 7 of about 1,100 totals requests, concentrated on about 17 carts; these support best-effort failure reporting, not ignoring lifecycle races.
- No usable current-quote totals after business work → report local items without an invented event value/coupon. Payment is unavailable until a business refresh supplies usable totals.
- The shopper leaves before readiness → that visit has no event; do not emit on a later page.
- The category field changes to one named category, and purchase custom-field amounts are rounded to cents.
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
