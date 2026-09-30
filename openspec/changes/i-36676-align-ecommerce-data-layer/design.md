# Design

## Context

See `proposal.md` for motivation. `EventBusListener.ts` already creates all required events, and `track-ecommerce-event.factory.ts` clears ecommerce before each push. The defect is primarily in payload preparation:

- Purchase, checkout steps, and cart views use `base_grand_total` with quote/order currency.
- Item helpers pass the entire `PriceHelper.getProductDiscount()` object as `discount`. Cart pricing helpers return line amounts, not unit amounts.
- Cart pricing already uses `budsies_quote_item_totals` through `PriceHelper.getCartItemPrice`. The adjacent Magento `UpdateRegularPriceAndSavings` observer calculates the final unit price after item coupon discounts, including bundle children. The existing helper multiplies custom unit prices by quantity; subtracting a transaction discount again would be incorrect.
- Both order builders already copy the USD base shipping and tax fields into `Order.paymentDetails`. User-selected currency affects separate localized display-price getters; ecommerce reporting always uses USD.
- The cart page currently reports a view once cached items are loaded and the page mounts; server totals can still be pending, leaving `coupon` unavailable after a full reload.

## Goals / Non-Goals

**Goals:** Correct the existing fields with local mapping/calculation changes; reuse backend discounts and existing order data; make the changed contract reviewable with representative payload tests.

**Non-Goals:** A new analytics service, parallel Data Layers, new event subscriptions, a discount engine, general checkout/order snapshot infrastructure, backend changes, broad listener refactoring, or changes to global display-pricing helpers. Preserve the configured GTM script source from #36478.

## Decisions

### Data Layer field changes

The paths below are relative to each pushed event. `items[]` means every emitted item. `quantity` defaults to 1 when a product event has no quantity. All monetary values use USD and tax-exclusive item prices; round the summed event value to two decimals.

| Event(s) | Data Layer path | Current payload | Required payload |
| --- | --- | --- | --- |
| `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase` | `ecommerce.value` | `base_grand_total` | Sum of emitted `items[].price * items[].quantity` after merchandise discounts; excludes shipping and tax. Purchase uses the placed order's items. |
| `view_item`, `add_to_cart`, `remove_from_cart` | `ecommerce.value` | `PriceHelper.getFinalPrice(...)` | Same item-revenue sum as the emitted items, including quantity for cart lines. |
| All existing ecommerce events with `items` | `ecommerce.items[].price` | Product display price or cart display line price divided by quantity | Numeric, tax-exclusive discounted USD unit price. For cart/order items, call the existing unlocalized `PriceHelper.getCartItemPrice` on the supplied item, then divide `PriceHelper.getFinalPrice(price)` by quantity. The helper already uses `budsies_quote_item_totals.final_price`, including bundle and coupon calculations. Keep product tax-exclusive mapping separate. Do not subtract an already included coupon twice. |
| All existing ecommerce events with `items` | `ecommerce.items[].discount` | `{ discount, discountPercent }` | Numeric USD monetary discount **per unit**, or `0`. For cart/order items, divide the nonnegative numeric `.discount` from `PriceHelper.getProductDiscount(price)` by quantity; product mapping uses the difference between tax-exclusive regular and paid prices. No percentage or object. |
| All existing ecommerce events with `items` | `ecommerce.items[].item_category` through `item_category5` | One pipe-joined string in `item_category` | Up to five separate category-name strings, broadest to most specific, from a known ancestor chain. If no chain is known, emit at most one known category; omit unavailable levels. |
| `purchase` | `ecommerce.shipping`, `ecommerce.tax` | `base_shipping_amount`, `base_tax_amount` | Keep separate numeric USD `base_shipping_amount`, `base_tax_amount` from existing order payment details. Neither contributes to `value`. |
| All events with `ecommerce.value` | `ecommerce.currency` | Quote/order currency | Always `USD`, independently of the selected display currency. |
| `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase` | `ecommerce.coupon` | Existing applied transaction coupon | Keep the applied code (empty string on purchase when absent); the coupon is descriptive, while its monetary effect is included in item `price` and `discount`. |
| `view_cart` | `ecommerce.coupon` | Absent even when a coupon is applied | Applied `platformTotals.coupon_code` when available; no coupon code after removal. Its monetary effect is already included in item revenue. |
| `purchase` | `ecommerce.transaction_id`, `ecommerce.items` | Confirmation order ID and mapped order products | Keep the confirmation ID and item list, with the corrected item fields above. |

Keep the existing `event` names, `shipping_tier`, `payment_type`, `items[].item_id`, `item_internal_id`, `item_variant`, `quantity`, integration custom fields, and `ecommerce: null` push before each ecommerce event. No new fields or event types are required beyond the category levels.

### 1. Correct the existing item helpers and derive event value from their output

Keep the current listener and helper structure. Add a small pure helper for repeated monetary calculations only if needed. Update product/cart item mappers and every existing value-bearing ecommerce handler to use compatible amounts; list/selection events need no new value field.

Reuse `PriceHelper.getCartItemPrice(cartItem, productDiscountedPrice)` for both cart and placed-order items. It already reads custom regular/final unit prices, multiplies them by quantity, and owns the existing fallback when custom totals are unavailable. Map its line amounts to unit `price` and numeric unit `discount` using `getFinalPrice` and `getProductDiscount`. Do not add standard row-total calculations, bundle exceptions, or another tax conversion to cart mapping. Calling the helper on the supplied item also avoids resolving a placed order's price from a cached current-cart item.

Keep product tax-exclusive mapping separate from cart mapping. Do not apply the selected display exchange rate or change storefront display-price calculations. Prevent division by zero and non-finite output; cart items with invalid or nonpositive quantities report zero price and discount.

Calculate `value = sum(item.price * item.quantity)` and round the aggregate to two decimals. The value helper needs no currency argument or currency-precision lookup. Retain sufficient fractional unit precision for quantities such as three units sharing a one-unit monetary discount. Reuse Magento's transaction-discount allocations; do not redistribute its aggregate discount across already discounted items.

Alternative rejected: changing only `value` to grand total minus shipping and tax. It leaves item discount/price errors and can misclassify payment adjustments such as gift-card redemption as merchandise discounts.

### 2. Reuse existing USD order amounts

Report `currency: USD` and use the existing `base_shipping_amount` and `base_tax_amount` in order payment details. Both order builders already copy these fields; no new shipping/tax fields are needed. Keep existing custom/affiliate calculations. Purchase calculations use the products/totals carried by the order, rather than resolving paid prices from current cart getters after asynchronous work.

Selected currency is a display concern handled by localized getters. Analytics uses existing unlocalized USD pricing and base totals without currency conversion, new persistence, or API requests.

Alternative rejected: changing ecommerce reporting to the shopper's selected display currency; reporting is required to stay in USD.

### 3. Map existing category ancestry without fetching more data

Update the category helper to return GA4 category fields and spread them into the base item data. Use existing category path/ancestry metadata to select a deterministic deepest known branch; use at most its first five named levels. For ties use a stable category identifier. If ancestry is unavailable, emit the first available named category only; omit unknown levels.

Alternative rejected: splitting the current joined string directly into levels, because unrelated category assignments are not necessarily ancestors.

### 4. Wait for synchronized cart totals before reporting a view

Replace the cart page's existing loading watcher with a focused Composition API composable. Once mounted and local cart items are loaded, an online, nonempty cart is ready only when `cart/getLastTotalsSyncDate` is greater than zero, `cart/isTotalsSyncRequired` is false, and cart, totals, and coupon processing are idle. The timestamp is not persisted and is set only after successful server totals and item updates, so cached items alone cannot establish readiness on reload. Do not use coupon presence as a readiness signal: synchronized carts can have no coupon.

Read items and platform totals together when ready and emit the existing `CART_VIEWED` event once per mounted cart-page visit. Later synchronization or coupon changes must not create additional views. A new visit can emit immediately if totals are already synchronized. Dispose the watcher with the component so leaving before totals arrive does not report a cart view later. Keep visual loading behavior independent and reuse existing state; add no requests, timeouts, persisted flags, or global event subscriptions.

Empty carts and disabled/offline totals synchronization keep reporting after local loading and mount when processing is idle. For an online, nonempty cart with no successful totals response, keep the view pending until a successful synchronization; do not report incomplete revenue or coupon data after a failed request.

## Risks / Trade-offs

- Backend bundle or tax semantics differ from assumptions -> Check representative simple/bundle totals against emitted line revenue; do not ship guessed tax or currency conversions.
- New field semantics affect RTB House, Facebook, or affiliate tags -> Preserve custom fields and inspect their actual mappings during rollout. Consumers needing former gross revenue must use an explicit GTM mapping from existing monetary inputs, not the corrected GA item-revenue field.

## Migration Plan

1. Run focused mapper/listener regression tests, changed-file lint, and type checking. Cover no discount, quantity greater than one, combined catalog/coupon discounts, bundles, tax, currency differences, zero-price items, and rounding. Verify event counts and clear-before-push behavior using the existing event handlers.
2. Prepare before/after examples and GTM mapping notes. For two 100-unit-price items with a 20 merchandise discount, 12 shipping, and 8 tax, the corrected purchase has `value: 180`, item `price: 90`, item `discount: 10`, `quantity: 2`, shipping 12, and tax 8. Explain the old object discount and joined category fields explicitly.
3. The GTM owner reviews affected ecommerce consumers and applies any needed parameter mappings. Verify `begin_checkout`, `add_shipping_info`, `add_payment_info`, and `purchase` in Preview; verify purchase fields in GA4 DebugView. Keep these checks pending until evidence exists.
4. Record results and external container changes in final Redmine notes. Roll back coordinated storefront/container mappings together if integration checks fail.

## References

- [GA4 purchase parameters](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#purchase)
- [GA4 ecommerce implementation](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [GA4 discount handling](https://developers.google.com/analytics/devguides/collection/ga4/apply-discount)
