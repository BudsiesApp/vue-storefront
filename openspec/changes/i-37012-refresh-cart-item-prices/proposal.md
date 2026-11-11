# Proposal

## Why

Cart lines show special prices that do not match the cart totals (#37012). After a coupon is applied or removed, only the totals change. After a cart price rule is enabled or disabled in Magento, the correct line prices appear only after a second page reload. The cause is that line prices are refreshed only from `cart/pull`. That call is not made after coupon actions, and it returns item pricing that Magento has not recalculated. Magento #37029 (deployed to production on 2026-11-05) now returns the recalculated item pricing (`budsies_quote_item_totals`) in every totals response, but the storefront ignores it.

## What Changes

- When a totals response (`shipping-information` or `totals`) is applied to the cart, each cart item matched by its server item ID also receives the item pricing from that response. Its other item data (customization state, plushie ID, purchase flow, estimated shipment, virtual-item flag) is preserved.
- A totals response item without item pricing, or one that matches no cart item, leaves the cart item's pricing unchanged.
- As a result, cart-line prices, and every display that derives from the cart item price dictionary, follow the totals:
  - immediately after a coupon is applied or removed, without a reload;
  - on the first page load after a cart price rule is enabled or disabled;
  - on checkout entry, where `cart/pull` does not refresh item data.
- The `ExtensionAttributes` type describes the full item pricing shape (`savings_amount`, `discount_amount`).
- Known limitation, accepted for this change: on page load, cart lines keep showing the item pricing restored from local storage and returned by `cart/pull` until the first totals response arrives. Locally this took about 2–3 seconds. No loading state is added.

Out of scope:

- Cart-line price calculation rules, such as paid custom option surcharges and zero campaign prices. They belong to #36676.
- GTM ecommerce data (#36676).
- Customization option prices shown under a cart line.
- The duplicate `shipping-information` request on load.
- Magento changes to make `cart/pull` return recalculated pricing.

## Capabilities

### New Capabilities

- `cart-item-pricing`: How cart-line prices follow server-calculated item totals after cart totals are recalculated. #36676 (`i-36676-align-ecommerce-data-layer`) defines the same capability with an identical refresh requirement, so whichever change is archived second must drop or adjust that requirement.

### Modified Capabilities

None.

## Impact

- Code: `core/modules/cart/store/actions/totalsActions.ts` (`overrideServerTotals`), new `core/modules/cart/helpers/create-totals-item-update.function.ts`, `src/modules/customization-system/types/extension-attributes.interface.ts`.
- Tests: new `core/modules/cart/test/unit/store/totals-item-refresh.spec.ts`. The `totalsActions.spec.ts` context mock gains `getCartItems`. Core tests do not run in CI, so their results are reported in the PR.
- APIs: none changed. The change relies on the Magento #37029 response contract (`totals.items[].extension_attributes.budsies_quote_item_totals`), which is already deployed.
- Theme, payment module, and VSF API: no changes. No companion PRs are needed.
- Coordination: #36676 / PR vue-storefront#504 contains the same cart refresh code. That branch should merge or rebase onto this change and drop its duplicate.
