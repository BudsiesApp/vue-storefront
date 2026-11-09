# Proposal

## Why

Existing ecommerce payloads report item prices and discounts in shapes GA4 does not expect, keep stale item prices after coupon changes, can lose cart and checkout events while cart totals are loading, and hash customer emails differently from what downstream consumers expect. Aligning item-level data, event timing, and the email hash with Google's ecommerce documentation supports #34005 without changing the tracking architecture or the event value sources.

## What Changes

- Report item `price` as the discounted, tax-exclusive unit price and `discount` as a numeric unit monetary discount, rounded to four decimal places and including transaction discounts exactly once; normalize reported item quantities.
- Keep the current event `value` and `currency` sources: grand total with quote or order currency for cart, checkout, and purchase events; product or line price for item events.
- Refresh cart item prices from recalculated server totals after a coupon is applied or removed, so the cart page and the cart, checkout, and purchase events no longer keep stale prices.
- Map `add_to_cart` items from the server-synchronized cart line, keeping the added quantity and the added product's categories.
- Stop capping a cart item's paid price at the base product price when a paid option raises it.
- Keep zero-valued campaign prices and selection quantities in bundle campaign prices, and show a product or upgrade made free by a campaign as free.
- Report the first assigned category as `item_category`; product data does not identify the category hierarchy, so deeper levels are not reported.
- Report `view_cart` and `begin_checkout` only after server totals are synchronized; add the applied coupon to `view_cart`.
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
- Core cart and price helpers: totals refresh in `core/modules/cart/store/actions/totalsActions.ts`, cart item pricing in `core/helpers/price.ts`, and bundle campaign pricing in `core/helpers/bundle-product-discounted-price.ts`. In the affected cases these also change displayed cart and product prices.
- Theme: cart-page and checkout-page event timing.
- New dependency `js-sha256`; `js-sha3` remains for its existing uses.
- Focused Jest regression tests and a GA4 DebugView verification handoff for Redmine.
- No backend API changes, new events, or checkout-flow changes. Relies on Magento returning `budsies_quote_item_totals` on totals response items.
