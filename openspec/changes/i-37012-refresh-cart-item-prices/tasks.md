# Tasks

Code tasks 1.1–1.3 and 2.1–2.2 were made in the working tree on 2026-11-10/11, before this proposal. They are byte-identical to the corresponding files on `36676-update-ecommerce-data-layer`. They are marked done because their verification has already passed.

## 1. Item pricing refresh from totals responses

- [x] 1.1 Add `core/modules/cart/helpers/create-totals-item-update.function.ts`. It returns `{ server_item_id, totals, qty }`, plus merged `extension_attributes` with the response's `budsies_quote_item_totals` when a cart item with the same `server_item_id` exists. Verify with task 2.1.
- [x] 1.2 Use the helper in `overrideServerTotals` (`core/modules/cart/store/actions/totalsActions.ts`) with `getters.getCartItems`. Verify that ESLint passes on the file and that `tsc --noEmit` reports no errors in it.
- [x] 1.3 Add `savings_amount` and `discount_amount` to `budsies_quote_item_totals` in `src/modules/customization-system/types/extension-attributes.interface.ts`. Verify that `tsc --noEmit` reports no errors in the file.

## 2. Unit tests

- [x] 2.1 Add `core/modules/cart/test/unit/store/totals-item-refresh.spec.ts`, covering coupon apply and removal, preserved customization, plushie and flow data, a response without item totals, and an unmatched response item. Verify with `npx jest -c test/unit/jest.conf.js core/modules/cart/test/unit/store/totals-item-refresh.spec.ts`: 4/4 pass.
- [x] 2.2 Pass `getters: { getCartItems: [] }` in the `replaces server totals` context mock in `core/modules/cart/test/unit/store/totalsActions.spec.ts`. Verify that the change is limited to that mock. The suite does not load, because of an existing `core/filters/date.js` circular import that also fails on the base branch.
- [ ] 2.3 Run `yarn test:unit:core` and `yarn lint`. Verify that the new spec passes and that every failing suite also fails on `origin/optimuspro`. Record the summary for the PR description.

## 3. Manual verification (local Petsies stack)

- [x] 3.1 Guest cart, cart page: apply and remove a coupon. Verify that cart lines change without a reload and that their discounts add up to the totals discount. Done: $5→$4.50, $315→$283.50, $10→$9, total −33, then back.
- [x] 3.2 Guest cart: enable, then disable, an auto-applied cart price rule and reload the cart page once each time. Verify that the lines are correct after the first `shipping-information` of that load. Done: about 2–3 seconds of stale display before that, an accepted limitation.
- [x] 3.3 Enter checkout inside the app after a rule change. Verify that the lines update from `shipping-information` without `cart/pull`.
- [ ] 3.4 Repeat 3.1 with a logged-in customer cart. Verify the same line and totals behavior.
- [ ] 3.5 Repeat 3.1 with a bundle or customized plushie at quantity > 1. Verify that the line price matches the server line total and that the customization details shown under the line are unchanged.

## 4. Delivery

- [ ] 4.1 Open the PR for `37012-fix-incorrect-special-prices` into `optimuspro`, with core test results (2.3), the manual verification (section 3), and the known stale-on-load limitation. Verify that CI (`test_vsf1.yml`) passes with the default theme and payment branches.
- [ ] 4.2 Notify #36676 / PR vue-storefront#504 to rebase after this change lands and drop its duplicate cart refresh code and duplicate `cart-item-pricing` requirement. Verify that the note is posted on Redmine #36676.
