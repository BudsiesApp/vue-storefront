# Proposal

## Why

On `petsies-theme`, ecommerce payloads report item prices and discounts in shapes GA4 does not expect, cart and checkout events can fire before totals are ready, and email hashing differs from downstream expectations. Aligning item-level data, event timing, and email hashes supports #34005 without changing the tracking architecture or event value sources.

## What Changes

- Report item `price` as the discounted, tax-exclusive unit price and `discount` as a numeric unit monetary discount, rounded to four decimal places and including transaction discounts exactly once; normalize reported item quantities.
- Keep the current event `value` and `currency` sources: grand total with quote or order currency for cart, checkout, and purchase events; product or line price for item events.
- Apply recalculated line prices and quote totals synchronously so cart and checkout events do not observe a partially applied response.
- Report `add_to_cart` immediately when the Add action accepts the item. Use the cart line updated by the item write, the added quantity, and the added product's categories; do not wait for a totals refresh for analytics.
- Stop capping a cart item's paid price at the base product price when a paid option raises it.
- Preserve base behavior for free campaign products and bundle selection quantities in the new item mapping.
- Report the first assigned category as `item_category`; product data does not identify the category hierarchy, so deeper levels are not reported.
- Report `view_cart` and standard `begin_checkout` once per client-side visit after relevant cart work has settled, without blocking the shopper. Checkout sends pending edits before its one entry refresh. If totals are missing and the visit has not already tried, allow one read-only request without UI busy flags. Discard its reply if the cart changed or has pending edits. Use last-known same-quote totals or local items without an invented value or coupon when needed.
- Track the full totals span for analytics independently of UI busy flags. Apply only current-quote, latest-refresh totals, invalidate cached totals on quote changes or clear, defer reconnect behind an active sync, and exclude hydrated metadata from the cart synchronization hash.
- Add the applied coupon to `view_cart`; an empty cart reports neither the old coupon nor value. A missing cart on the Add's cart read shows a friendly translated error and reports no `add_to_cart`. A later background totals 404 clears the cart as usual, without retroactively rejecting an accepted Add.
- Report `customerEmailHashed` as SHA-256 of the trimmed, lowercased email, add `customerEmailHashedSha3` with the current SHA3-256 value, and clear both for a blank email so earlier values do not persist, for example after logout.
- **BREAKING for consumers of the old field semantics:** item `discount` becomes a number rather than an object, a single `item_category` replaces the pipe-joined category string, and `customerEmailHashed` changes from SHA3-256 of the raw email to SHA-256 of the normalized email.

## Capabilities

### New Capabilities

- `ecommerce-data-layer`: Specify the GA4-compatible item fields, event timing, and customer identifiers of the existing ecommerce Data Layer. This adds a specification for existing tracking, not a new tracking system.
- `cart-item-pricing`: Specify how cart item prices follow server-calculated item totals and campaign prices, including refresh after totals recalculation, paid surcharges, and bundle campaign prices.

### Modified Capabilities

None.

## Impact

- `src/modules/google-tag-manager/helpers/`: existing listener and item, price, and category mappers.
- Core cart and price helpers: totals application in `core/modules/cart/store/actions/totalsActions.ts` and paid-option cart pricing in `core/helpers/price.ts`. Paid options also affect displayed cart line prices.
- Cart startup/connection settlement, quote-owned totals invalidation, and exception-safe Add completion; the checkout entry sequence sends pending local edits before its existing totals refresh.
- Theme: move cart-view reporting from the loading watcher to a mounted composable and checkout-start reporting from `beforeMount` to a mounted handler awaiting entry.
- New dependency `js-sha256`; `js-sha3` remains for its existing uses.
- Focused Jest regression tests and a GA4 DebugView verification handoff for Redmine.
- No backend API changes or new events. Express-checkout triggering is unchanged. Uses `budsies_quote_item_totals` from Magento item writes and totals responses when available.

## Scope boundaries

Report the first named category and round purchase `custom_fields.subtotal_value` and `affiliate_total` to cents. Do not broaden the cart changes beyond the stated timing, totals ownership, and edit-preservation requirements.
