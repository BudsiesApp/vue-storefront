# Design

## Context

See `proposal.md` for motivation. `EventBusListener.ts` already creates all required events, and `track-ecommerce-event.factory.ts` clears `ecommerce` before each push. Relevant current behavior:

- Cart items carry Magento's `extension_attributes.budsies_quote_item_totals` per unit: `regular_price` is the base product price without custom options; `final_price` is the paid price after item discounts; `savings_amount` is the paid price before discounts minus the base price; and `discount_amount` is the negative coupon discount. `PriceHelper.getCartItemPrice` treats `regular_price` as the undiscounted price, so a paid surcharge yields a special price above the regular price, which `getFinalPrice` caps.
- `overrideServerTotals` updates only `totals` and `qty` of each cart item, so `budsies_quote_item_totals` keeps its last cart-pull value after coupon changes. Magento returns `budsies_quote_item_totals` on every totals response item (budsies-store-m2#458).
- The `afterAddToCart` hook receives the product before cart preparation, without server item totals. `addItems` awaits the sync that copies server item totals onto the store line, but not the later product-data reload that restores the line's categories. `remove_from_cart` already receives the store cart line.
- `getBundleOptionDiscountedPrice` resolves child prices with `||`, so a zero campaign price falls back to the normal price, and it ignores selection quantities. It feeds displayed product prices and cart items without item totals. Displayed prices then pass through `getProductPrice` in `core/helpers/price.ts`, which also treats a campaign final price of 0 as missing (`productDiscountedFinalPrice || priceInclTax`), so a free upgrade is offered at its regular price. Product price fields come from the API's server-side tax calculation: an unset or expired special price has `special_price: null` and `special_price_incl_tax: 0`, while an active zero special price also sets `price_incl_tax` to 0.
- `platformTotals` is not restored on page load and is set by the first server totals response. The checkout page emits `BEGIN_CHECKOUT` in `beforeMount`, and the handler reads `platformTotals.coupon_code`, so the event is lost whenever checkout mounts before that response. A server-rendered checkout request always redirects to the cart (`asyncData` in `core/pages/Checkout.js`), so this happens only after in-app navigation, for example right after a full load of another page.
- Product documents store their categories as `{category_id, name, position}` only, without a path or parent; the ID paths exist only on category documents, which item mapping does not load.
- After a cart merge, the totals sync and the product-data refresh run in parallel. The cart hash covers every item field except `stock` and `totals`, and the totals step stores it when it ends; if the product-data refresh finishes later, the catalog fields it writes change the hash, `isTotalsSyncRequired` stays true, and no further sync repairs it.
- `customerEmailHashed` is the SHA3-256 digest of the raw email at three call sites, including for blank emails.

## Goals / Non-Goals

**Goals:** Correct item-level fields, event timing, and email hashes with local changes; reuse backend item totals; keep event value sources; make each changed contract reviewable with focused tests.

**Non-Goals:** Changing event `value` or `currency` sources; a new analytics service, parallel Data Layers, or new event types; a discount engine; checkout/order snapshot infrastructure; backend changes; broad listener refactoring; display-pricing changes beyond the cart item-totals and bundle campaign corrections in Decisions 3 and 4. Preserve the configured GTM script source from #36478.

## Decisions

### Data Layer field changes

Paths are relative to each pushed event; `items[]` means every emitted item.

| Event(s) | Data Layer path | Current payload | Required payload |
| --- | --- | --- | --- |
| All ecommerce events with `items` | `items[].price` | Product display price or cart display line price divided by quantity | Numeric, tax-exclusive, discounted unit price. Cart/order items: `getFinalPrice(getCartItemPrice(item))` divided by the normalized quantity, using refreshed item totals (Decision 3). `add_to_cart`: the synchronized line (Decision 5). Products: tax-exclusive product mapping. Coupons are never subtracted twice. |
| All ecommerce events with `items` | `items[].discount` | `{ discount, discountPercent }` | Numeric per-unit monetary discount, or `0`. |
| Cart/order events | `items[].quantity` | Raw item `qty` | Normalized quantity (Decision 2). |
| All ecommerce events with `items` | `items[].item_category` | One pipe-joined string | First named assigned category; no further levels (Decision 6). |
| `view_cart` | `ecommerce.coupon` | Absent | Applied `platformTotals.coupon_code`, when available. |
| `begin_checkout` (checkout page) | event timing | Emitted in `beforeMount` | Emitted once per visit when totals are ready (Decision 7). |
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

In `overrideServerTotals`, when a totals item has `extension_attributes.budsies_quote_item_totals`, pass it to `updateItem` as `extension_attributes: { ...existing, budsies_quote_item_totals }`. Merging matters because plushie, flow, and customization data share that object. When it is absent, leave the item's attributes unchanged. Apply and removal both pass through this action.

In `getCartItemPrice`, with custom totals: regular = (`regular_price` + max(0, `savings_amount`)) × qty; special = `final_price` × qty when below the regular price, otherwise `null`. When `savings_amount` is absent, regular = max(`regular_price`, `final_price`) × qty. For `savings_amount` ≤ 0, the result equals the previous calculation. Add `savings_amount` and `discount_amount` to the item-totals type.

Alternatives rejected: deriving unit prices from `row_total` and `discount_amount` (duplicates Magento's calculation; `row_total_with_discount` is 0); fixing only the GTM mapper (leaves the cart display wrong).

Totals are usable only when they carry both `regular_price` and `final_price` (`hasCartItemTotals`). The server totals are tax-exclusive, but the fallback of `getCartItemPrice` reads the tax-inclusive product fields, so the GTM cart mapper does not use that fallback: for a cart or order item without usable totals it prices the item with `prepareCartLinePrice`, which removes tax once with the item's own net/gross pairs and honors the selected bundle options (Decision 5). `add_to_cart` needs no separate fallback because it goes through the same mapper.

### 4. Keep zero and quantity in bundle campaign prices

In `getBundleOptionDiscountedPrice`, resolve each child's campaign final and regular price with finite-number checks instead of `||`, and multiply by the selection's `qty`; a missing, zero, negative, or non-numeric quantity counts as 1, the default `getDefaultBundleOptions` uses. Keep the product-field fallback (`special_price_incl_tax`, then the current price): `special_price_incl_tax` is 0 both for an unset and for a real zero special price, and a real zero special price also makes the current price 0, so the fallback already resolves both cases correctly. The core helper also corrects displayed prices for the affected bundles. In `getProductPrice`, treat any finite campaign final price, including 0, as present (`??` and `!== undefined` instead of `||` and `!!`); missing or non-numeric campaign prices keep the existing resolution, so only zero-priced campaign products display differently. Alternative rejected: a GTM-only copy duplicates logic and leaves displayed prices wrong.

### 5. Map `add_to_cart` from the synchronized line

After `addItem` completes, find the store line matching the added product and map it with the action quantity and the added product's `category`/`category_ids`; keep `value` on its previous source, the cart item price getter for the added product, so the event value is unchanged by this mapping. When no line or no usable item totals exist (offline or unsynchronized carts), map the added product with the action quantity through the shared cart mapper, which uses the tax-exclusive cart line price (Decision 3): the gross price comes from the options the customer selected (`calculateCartItemBundleOptionsPrice` and `getCartItemDiscountedPrice`, as for cart lines) and tax is removed with the same net/gross pairs as for products. Product and listing events keep the default bundle options. `remove_from_cart` keeps mapping the store line it receives. The cart's `afterAddToCart` hook runs before server errors are checked and also when `addItems` rejected the add locally, so skip the event when the hook's diff log shows a rejection: a failed server response (the rule `throwServerErrorFromDiffLog` uses to show the error) or an error notification (`addItems` reports out-of-stock products and failed validation only that way). A warning notification, for example volatile stock, still means the item was added.

A failed cart read at the start of the synchronization (`performSync`) is not the rejection of an item, with one exception. When the cart answers with an error other than "not found" (a 500, a 503, or no result code), nothing is synchronized, but the local change (`CART_ADD_ITEM`) stays in the cart and the cart hash still differs, so a later synchronization sends it. `performSync` therefore returns an empty diff log, as before, logs the failure (the `Logger.error` call was missing its trailing `()`), and the add shows no error and reports `add_to_cart`: the item is in the cart. Reporting the failure as a failed server response made `addItem` show an error for an item that stayed in the cart, and the shopper's retry increased the line again (quantity 2 sent to Magento). A cart that is not found (404) is different: it is cleared and disconnected, which also removes the local change, so nothing is left that a retry could apply twice. There `performSync` returns a failed server response (`status` 404), `addItem` shows an error, and no event is reported, as for any other response of the server that rejected the item. Alternatives rejected: undoing the local quantity change after a failed read (it needs a rollback for several products, and a concurrent change to the same line could be lost) and skipping the event when the added product has no cart line (it would not cover an unsynchronized new line or a quantity increase, and a line that `productsEquals` fails to match would drop a valid event).

### 6. Report one category level

Report the first named category of the product as `item_category` and no further levels. Product data has no category paths, so a hierarchy cannot be verified without loading category documents. Cart items rely on the categories that cart synchronization restores; `add_to_cart` uses the added product's categories.

Alternatives rejected: deriving ancestry from path segments matched against slugs (product data has no paths, and slug matching accepts unrelated categories); building the hierarchy from categories loaded in the store (none are loaded on product and cart pages); loading categories by ID while mapping items (an extra request that delays item events).

### 7. Shared readiness for cart and checkout events

Extract the readiness computation of the cart-page composable into a shared composable used by the cart page (`view_cart`) and the checkout page (`begin_checkout`): mounted, local cart data loaded, a successful totals timestamp, no totals sync required, and idle cart, totals, and coupon processing. Empty or offline carts follow the existing cart-view rules. The checkout page emits once per mounted visit and only for a nonempty cart; express checkout keeps its trigger. Checkout handlers read `platformTotals` with null guards.

The cart hash (`calcItemsHmac`) also omits the catalog fields the product-data refresh writes (`productFieldsAllowedToUpdate`, except `sku`), alongside `stock` and `totals`, so readiness no longer depends on which parallel step finishes last. Quantity, SKU, selected options, and extension attributes still change the hash. Alternative rejected: storing the hash again after both steps finish, which could absorb a quantity change made in between and let the following sync be skipped.

The hash also omits `extension_attributes.budsies_quote_item_totals`, and an `extension_attributes` object left empty by that is dropped. Every totals refresh now writes those item totals (Decision 3), and only coupon actions and the cart merge store the hash afterwards, so a plain `syncTotals` (for example after a shipping address change that applies a country cart rule) would leave `isTotalsSyncRequired` true and block `view_cart` and `begin_checkout` for the rest of the page session.

`isTotalsSyncing` stays set until a totals response is fully applied: items, totals, and the sync timestamp. It is a counter (`totalsSyncDepth`, changed by `START_TOTALS_SYNC` and `FINISH_TOTALS_SYNC`), because the holds nest: `syncTotals` holds it from its start when a sync will happen, `overrideServerTotals` holds it across the request and the apply, and `getTotals` across the request. Holding only `getTotals` (the original behavior) leaves two gaps in which the cart looks synchronized with the old totals: after the request and before the apply, and between the payment-methods pull and the totals request inside `syncTotals`. A page mounted in either gap reports `view_cart` once with the old prices.

A refresh that fails leaves the stored totals unverified, because they may predate a change the server already accepted, for example a coupon. `CART_RESET_TOTALS_SYNC` sets the totals sync date back to 0 when the request is rejected, answers with an error other than a missing cart (which clears the cart instead), returns a response that cannot be applied (including one without a result), or when `syncTotals` fails before it reaches the totals request, for example in the payment-methods pull. The reset covers everything up to the moment the sync date is set, so a failure after a successful apply, such as in the payment-methods step of the response, keeps it. Readiness then waits (a nonempty online cart needs a successful totals response) and `isTotalsSyncRequired` is true again, so the next sync check retries the refresh and the page reports once with the refreshed totals. The cost is that a refresh that keeps failing sends no `view_cart` or `begin_checkout` for that visit, which is preferred to sending the old coupon and prices. Alternatives rejected: a separate "refresh failed" flag (duplicates what the sync date already says) and resetting only in the coupon actions (misses the gift-card, shipping, and express-checkout refreshes).

Refreshes can overlap (a coupon is applied while an address lookup refresh is in flight) and their responses can arrive in any order, so the last response would otherwise win whatever its age. Each `overrideServerTotals` takes a number from the `totalsRefreshId` generation counter (`START_TOTALS_REFRESH`) when it starts, and the refresh that started last decides the totals: the response of an older refresh is not applied and its failure does not reset the sync date, while the syncing counter still holds readiness until every refresh has finished. A `syncTotals` that fails before its totals request resets the sync date only if no newer refresh has started since it began. Alternative rejected: serializing the refreshes in a queue, which orders the server processing but delays every refresh behind the previous one. The generation is the start order of the requests, which approximates but does not guarantee the order in which the server processed them.

Every answer is applied only to the cart that was requested: `overrideServerTotals` captures the cart token when it starts and ignores the answer when the token is no longer the same, for example when a quote answers late after the customer's cart was connected again. This covers a not-found answer (it would clear the current cart for the sake of an old one), a successful response (it would give the current cart the totals of the old quote and mark it as synchronized), and the failure of the request (it would invalidate the totals of the current cart). For a not-found answer the check is only the cart identity, not the generation, because a not-found answer for the same cart is true whichever refresh started last; for the other answers the response is outdated when the cart was replaced or a newer refresh started. The check runs once, immediately before the response is applied, and the application itself does not wait: the line prices (committed directly, not through the awaited `updateItem` action), the totals, and the sync date are written in one synchronous step, so no newer refresh or reconnect can start while only a part of the response is applied.

A not-found answer clears the cart with `clear`, which then reconnects the cart (`synchronizeCart`). The reconnect synchronizes the cart, which queues behind the running synchronization, so awaiting it from within that synchronization (a synchronization that waits for the totals, `waitForTotalsUpdate`, or the merge when it finds the cart missing) waited for itself: the synchronization never finished and `isTotalsSyncing` stayed set, so `view_cart` and `begin_checkout` were never reported. `clear` now starts the reconnect after the running synchronization has finished (`waitForCartSync`) and does not await it when a synchronization is running; without a running synchronization it still awaits the reconnect, as before.

### 8. Customer email hashes

Add `js-sha256` and one helper that returns both digests for a nonblank email: SHA-256 of `email.trim().toLowerCase()` and SHA3-256 (`js-sha3`) of the raw email. For a blank email, it returns both keys set to `undefined`; GTM's data model keeps values from earlier pushes, and an `undefined` value clears them, so a blank email, including the cleared customer data after logout, removes earlier hashes. Use it at the wizard override, the purchase push (order email), and `getCustomerEventData()`. Keep `js-sha3` for the existing SHA3-224 uses.

## Risks / Trade-offs

- Shared pricing helper changes affect displayed prices → output is unchanged unless `savings_amount` > 0 or a bundle campaign child is zero-priced or has a selection quantity above one; cover each case with regression tests.
- Paid option combined with a sale price → Magento merges both into `savings_amount`, so the paid price is correct but the regular price and discount omit the sale part.
- Paid-option items → the order summary's regular subtotal and savings come from Magento totals based on base prices and stay inconsistent with the corrected line price.
- `customerEmailHashed` changes value → `customerEmailHashedSha3` carries the previous digest for consumers that need it.
- Shared `discount` and category semantics change for non-GA consumers → document the before/after shapes.
- The cart hash covers fewer fields → after deployment, stored cart hashes no longer match once, causing one extra cart synchronization per visitor.
- `isTotalsSyncing` is true for the whole `syncTotals` call, including the payment-methods pull → `view_cart`, `begin_checkout`, and the order-confirmation guard wait slightly longer when a totals sync is in progress, and never when none is needed.

## Migration Plan

1. Run focused mapper, listener, cart action, price helper, and composable tests, changed-file lint, type checking, and strict OpenSpec validation.
2. Prepare before/after examples for discount, category, coupon, and email-hash fields, stating that value and currency are unchanged.
3. Verify purchase fields in GA4 DebugView; keep this check pending until evidence exists.
4. Record DebugView results in the final Redmine notes.

## References

- [GA4 purchase parameters](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#purchase)
- [GA4 ecommerce implementation](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [GA4 discount handling](https://developers.google.com/analytics/devguides/collection/ga4/apply-discount)
