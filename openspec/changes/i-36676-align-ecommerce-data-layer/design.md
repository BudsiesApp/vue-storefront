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

Parse the item quantity once: a finite positive number, including a numeric string, is used for both the reported `quantity` and the unit-amount division. Any other value reports `quantity: 0` with zero price and discount. Product events report a finite positive quantity, including a numeric string, and otherwise `1`. One helper normalizes quantities for both mappers. Unit amounts that are not finite, or not positive, are reported as 0, so invalid custom totals or catalog prices never emit NaN or Infinity.

Round unit `price` and `discount` to four decimal places, the precision of Magento's item totals, in both the cart and product mappers. This removes floating-point noise from divisions and subtractions without losing allocated coupon precision.

### 3. Refresh and interpret cart item totals

In `overrideServerTotals`, when a totals item has `extension_attributes.budsies_quote_item_totals`, pass it to `updateItem` as `extension_attributes: { ...existing, budsies_quote_item_totals }`. Merging matters because plushie, flow, and customization data share that object. When it is absent, leave the item's attributes unchanged. Apply and removal both pass through this action.

In `getCartItemPrice`, with custom totals: regular = (`regular_price` + max(0, `savings_amount`)) × qty; special = `final_price` × qty when below the regular price, otherwise `null`. When `savings_amount` is absent, regular = max(`regular_price`, `final_price`) × qty. For `savings_amount` ≤ 0, the result equals the previous calculation. Add `savings_amount` and `discount_amount` to the item-totals type.

Alternatives rejected: deriving unit prices from `row_total` and `discount_amount` (duplicates Magento's calculation; `row_total_with_discount` is 0); fixing only the GTM mapper (leaves the cart display wrong).

### 4. Keep zero and quantity in bundle campaign prices

In `getBundleOptionDiscountedPrice`, resolve each child's campaign final and regular price with finite-number checks instead of `||`, and multiply by the selection's `qty`; a missing, zero, negative, or non-numeric quantity counts as 1, the default `getDefaultBundleOptions` uses. Keep the product-field fallback (`special_price_incl_tax`, then the current price): `special_price_incl_tax` is 0 both for an unset and for a real zero special price, and a real zero special price also makes the current price 0, so the fallback already resolves both cases correctly. The core helper also corrects displayed prices for the affected bundles. In `getProductPrice`, treat any finite campaign final price, including 0, as present (`??` and `!== undefined` instead of `||` and `!!`); missing or non-numeric campaign prices keep the existing resolution, so only zero-priced campaign products display differently. Alternative rejected: a GTM-only copy duplicates logic and leaves displayed prices wrong.

### 5. Map `add_to_cart` from the synchronized line

After `addItem` completes, find the store line matching the added product and map it with the action quantity and the added product's `category`/`category_ids`; keep `value` on its previous source, the cart item price getter for the added product, so the event value is unchanged by this mapping. When no line or no item totals exist, use the tax-exclusive product price mapping with the action quantity. `remove_from_cart` keeps mapping the store line it receives. The cart's `afterAddToCart` hook runs before server errors are checked, so skip the event when any server response in the hook's diff log failed, the same rule `throwServerErrorFromDiffLog` uses to show the error.

### 6. Report one category level

Report the first named category of the product as `item_category` and no further levels. Product data has no category paths, so a hierarchy cannot be verified without loading category documents. Cart items rely on the categories that cart synchronization restores; `add_to_cart` uses the added product's categories.

Alternatives rejected: deriving ancestry from path segments matched against slugs (product data has no paths, and slug matching accepts unrelated categories); building the hierarchy from categories loaded in the store (none are loaded on product and cart pages); loading categories by ID while mapping items (an extra request that delays item events).

### 7. Shared readiness for cart and checkout events

Extract the readiness computation of the cart-page composable into a shared composable used by the cart page (`view_cart`) and the checkout page (`begin_checkout`): mounted, local cart data loaded, a successful totals timestamp, no totals sync required, and idle cart, totals, and coupon processing. Empty or offline carts follow the existing cart-view rules. The checkout page emits once per mounted visit and only for a nonempty cart; express checkout keeps its trigger. Checkout handlers read `platformTotals` with null guards.

The cart hash (`calcItemsHmac`) also omits the catalog fields the product-data refresh writes (`productFieldsAllowedToUpdate`, except `sku`), alongside `stock` and `totals`, so readiness no longer depends on which parallel step finishes last. Quantity, SKU, selected options, and extension attributes still change the hash. Alternative rejected: storing the hash again after both steps finish, which could absorb a quantity change made in between and let the following sync be skipped.

### 8. Customer email hashes

Add `js-sha256` and one helper that returns both digests for a nonblank email: SHA-256 of `email.trim().toLowerCase()` and SHA3-256 (`js-sha3`) of the raw email. For a blank email, it returns both keys set to `undefined`; GTM's data model keeps values from earlier pushes, and an `undefined` value clears them, so a blank email, including the cleared customer data after logout, removes earlier hashes. Use it at the wizard override, the purchase push (order email), and `getCustomerEventData()`. Keep `js-sha3` for the existing SHA3-224 uses.

## Risks / Trade-offs

- Shared pricing helper changes affect displayed prices → output is unchanged unless `savings_amount` > 0 or a bundle campaign child is zero-priced or has a selection quantity above one; cover each case with regression tests.
- Paid option combined with a sale price → Magento merges both into `savings_amount`, so the paid price is correct but the regular price and discount omit the sale part.
- Paid-option items → the order summary's regular subtotal and savings come from Magento totals based on base prices and stay inconsistent with the corrected line price.
- `customerEmailHashed` changes value → `customerEmailHashedSha3` carries the previous digest for consumers that need it.
- Shared `discount` and category semantics change for non-GA consumers → document the before/after shapes.
- The cart hash covers fewer fields → after deployment, stored cart hashes no longer match once, causing one extra cart synchronization per visitor.

## Migration Plan

1. Run focused mapper, listener, cart action, price helper, and composable tests, changed-file lint, type checking, and strict OpenSpec validation.
2. Prepare before/after examples for discount, category, coupon, and email-hash fields, stating that value and currency are unchanged.
3. Verify purchase fields in GA4 DebugView; keep this check pending until evidence exists.
4. Record DebugView results in the final Redmine notes.

## References

- [GA4 purchase parameters](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#purchase)
- [GA4 ecommerce implementation](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [GA4 discount handling](https://developers.google.com/analytics/devguides/collection/ga4/apply-discount)
