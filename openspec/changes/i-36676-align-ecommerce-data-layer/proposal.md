# Proposal

## Why

Existing ecommerce payloads report grand totals as GA4 item revenue and use an incompatible item discount shape, which can distort conversion and revenue reporting. Aligning the existing fields with Google's ecommerce documentation supports #34005 without changing the tracking architecture or checkout behavior.

## What Changes

- Update existing ecommerce item mappings so `price` is the discounted, tax-exclusive unit price and `discount` is a numeric unit monetary discount, including transaction discounts exactly once.
- Calculate event `value` from the emitted items and round the sum to two decimals; retain separate purchase shipping and tax, transaction ID, and coupon. Report all ecommerce amounts in USD regardless of the selected display currency.
- Populate `item_category` through `item_category5` where the existing product data provides category ancestry.
- Delay `view_cart` until server totals are synchronized for an online, nonempty cart, retaining the applied coupon after a full reload and emitting once per cart-page visit.
- Preserve event names, other firing points, item IDs, composed variants, internal product IDs, custom integration fields, and stale-ecommerce clearing.
- **BREAKING for consumers of the old field semantics:** `value` becomes net item revenue, `discount` becomes a number rather than an object, and category fields replace the joined category string. Document affected GTM mappings and verify non-GA consumers before rollout.

## Capabilities

### New Capabilities

- `ecommerce-data-layer`: Specify the GA4-compatible shape and compatibility constraints of the existing ecommerce Data Layer. This adds a specification for existing tracking, not a new tracking system.

### Modified Capabilities

None.

## Impact

- Primarily `src/modules/google-tag-manager/helpers/`: existing listener and item/category mappers, with small calculation helpers only where they avoid duplication.
- Reuse existing USD item pricing and base payment totals; no additional order payment fields or currency conversion are needed.
- A focused cart-page composable replaces the existing loading watcher for cart-view reporting, using existing synchronization state without additional requests.
- Focused Jest regression tests and a GTM/GA4 verification handoff with before/after examples for Redmine.
- No backend API changes, new analytics pipeline, new events, checkout-flow changes, global pricing refactor, or GTM/Cloudflare loader changes. GTM container edits and Preview/DebugView checks are external rollout work; container access is not assumed.
