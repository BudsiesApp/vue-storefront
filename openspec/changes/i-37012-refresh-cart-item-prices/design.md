# Design

## Context

- Cart-line prices come from `PriceHelper.getCartItemPrice`, which prefers `extension_attributes.budsies_quote_item_totals` (per-unit `regular_price`, `savings_amount`, `discount_amount`, `final_price`). Every cart price display goes through `cart/cartItemPriceDictionary` (cart page, confirm-order, cart items table, localized prices).
- That attribute currently reaches a cart item only through `cart/pull`: `mergeServerItem` → `updateClientItem` → `cart-prepare-item-product` → `fillProductWithAdditionalFields`. `mergeServerItem` skips this when `forceClientState` is set, which happens on checkout entry and on cart-line quantity sync.
- `overrideServerTotals` applies `shipping-information` or `totals` responses. It writes only `{ server_item_id, totals, qty }` to each cart item.
- Since Magento #37029, those responses carry `budsies_quote_item_totals` on each `totals.items[]` entry. The values are the in-memory result of the totals collection performed by the same request.
- `cart/pull` (`GET carts/:id/items`) does not collect totals. It returns the persisted pricing from the last collection, which is stale after a rule is enabled or disabled until the next collection. On every page load, `syncTotals` runs after the pull merge, because `cartServerLastTotalsSyncDate` starts at 0.
- Observed locally with the ported change, guest cart on Petsies:
  - Coupon apply and remove update the lines without a reload.
  - After a rule is enabled or disabled, the lines are correct after the first load's `shipping-information`. Stale values were shown for about 2–3 seconds before that.
  - Entering checkout inside the app updates the lines from `shipping-information` alone.

## Goals / Non-Goals

**Goals:**
- Make the totals response the authoritative refresh point for item pricing, in addition to `cart/pull`.
- Keep the change in core cart logic, with no theme or API changes.

**Non-Goals:**
- No loading or placeholder state for prices before the first totals response (user decision, 2026-11-11).
- No change to how `getCartItemPrice` turns item totals into regular and special prices.

## Decisions

### Merge item pricing in `overrideServerTotals`

A helper, `createTotalsItemUpdate(totalsItem, cartItems)`, builds the `updateItem` payload:
- It always includes `{ server_item_id, totals, qty }`, as before.
- When `totalsItem.extension_attributes.budsies_quote_item_totals` exists and a cart item has the same `server_item_id`, it adds `extension_attributes: { ...cartItem.extension_attributes, budsies_quote_item_totals }`.

Rationale:
- `CART_UPD_ITEM_PROPS` replaces properties as a whole with `Vue.set`, so the existing extension attributes must be spread in. Otherwise customization state, plushie ID, purchase flow, estimated shipment and the virtual-item flag would be lost.
- The pricing DTO is replaced as a whole, not merged field by field, because it is a single server-calculated snapshot.

Alternatives considered:
- Call `cart/pull` after coupon actions. This adds a request, and after a rule change it still returns stale persisted pricing.
- Emit `cart-prepare-item-product` with the totals item. That handler rebuilds all extension attributes from the server item, and a totals item has no customization data, so it would drop data.
- Overwrite the native totals fields. Those have Magento line-level semantics and a different sign convention.

### Missing data leaves pricing untouched

If the response item has no DTO, or no cart item matches it, the payload stays exactly as before. A missing DTO is not treated as zero, so a temporary Magento rollback or a non-Budsies response path cannot erase valid pricing.

### Matching by `server_item_id`

Totals items contain only visible (parent) quote items, and their `item_id` is the cart item's `server_item_id`. Bundle children therefore do not need separate handling: the parent DTO already contains the bundle's aggregated pricing, as verified with Forevers bundles.

### No cart hash adjustment

The cart items hash includes `extension_attributes`, so a refresh changes it.
- Coupon actions already commit `CART_SET_ITEMS_HASH` after `syncTotals`.
- The load path commits it in `updateTotalsAfterMerge` after `syncTotals`.

No additional sync loops are introduced.

### Type update

Add `savings_amount` and `discount_amount` to `ExtensionAttributes.budsies_quote_item_totals`. The DTO is stored as a whole, so the type describes what is actually held.

## Risks / Trade-offs

- **Stale display on page load:** prices restored from local storage and from `cart/pull` show until the first totals response (about 2–3 seconds locally). → Accepted. Documented in the proposal and allowed by the spec ("MAY show the previously stored item price").
- **Duplicate implementation in #36676 (PR #504):** it contains the identical helper and requirement. → Land #37012 first. #36676 rebases and drops the duplicate code and its duplicate ADDED requirement before archive.
- **`totalsActions.spec.ts` cannot load** because of an existing circular import (`core/filters/date.js` `once`), so the context-mock change is not exercised. → New behavior is covered by `totals-item-refresh.spec.ts`, which loads. The existing failure is reported in the PR.
- **Magento contract dependency:** if the DTO is absent, the behavior falls back to today's behavior (correct after `cart/pull`). → No storefront fallback calculation is added.

## Migration Plan

- Deploy the storefront only. Magento #37029 is already in production.
- Rollback: revert the storefront change. Pricing then refreshes only on `cart/pull` again.
