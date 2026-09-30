# Tasks

## 1. Correct existing ecommerce fields

- [x] 1.1 Implement the `items[].price` and `items[].discount` rows in `design.md`'s Data Layer field table; reuse the existing cart price helper and map its line amounts to unit price and numeric unit discount, removing duplicate row-total/bundle calculations. Verify simple/bundle custom totals, quantities, combined discounts, zero prices, and rounding without double subtraction.
- [x] 1.2 Implement the table's `value`, `currency`, `shipping`, and `tax` rows with fixed USD reporting and a value helper that rounds once to two decimals; reuse USD base item/payment totals and unlocalized pricing, remove unnecessary quote-currency order additions, and verify selected currency does not affect reporting, retaining coupon, transaction ID, and integration custom fields.
- [x] 1.3 Implement the table's `item_category` through `item_category5` row in the existing category/base-item mapping; verify ancestry order, unrelated categories, missing categories, and unchanged item IDs/internal IDs/composed variants.

- [x] 1.4 Replace the cart page's loading watcher with a focused composable using the existing successful-totals timestamp and idle synchronization state; emit once per mounted visit using current items/totals, preserve visual loading, and handle empty/offline carts without additional requests.

## 2. Verify the payload correction

- [x] 2.1 Add listener-level regression coverage for the four checkout/purchase events and the existing ecommerce clearing factory; verify one payload push per intended emission, preceding `ecommerce: null`, existing event names/metadata, and separate purchase shipping/tax.
- [x] 2.2 Run the focused GTM Jest suite, changed-file ESLint, and `yarn type-check`; record results and confirm the diff is limited to payload mapping, cart-view readiness, and tests, with GTM script-source configuration preserved. (`vue-tsc --noEmit -p tsconfig.vue-tsc.json` was run directly because the installed global Yarn is 1 while this project declares Yarn 4.)

- [x] 2.3 Add reactive lifecycle regression coverage for reload before totals arrive, already synchronized navigation, repeated synchronization, coupon-free carts, empty/offline carts, failed initial totals, and destruction before completion; run focused tests, changed-file lint, and type checking. (29 focused tests passed across six suites, including existing-helper cart mapping and USD reporting coverage; changed-file ESLint and the project's direct `vue-tsc` command passed.)

## 3. Document and verify the external GTM rollout

- [x] 3.1 Prepare Redmine-ready before/after payload examples and a GTM handoff covering changed value/discount/category semantics and non-GA ecommerce compatibility; verify all affected field paths and retained custom fields are listed.
- [ ] 3.2 With the GTM owner, verify/update actual GA ecommerce parameter mappings and affected RTB House/Facebook/affiliate mappings; capture Preview evidence for `begin_checkout`, `add_shipping_info`, `add_payment_info`, and `purchase` with expected event counts.
- [ ] 3.3 Obtain GA4 DebugView evidence for purchase revenue, shipping, tax, currency, coupon, and items; incorporate results and actual external container changes into the final Redmine notes, keeping external checks incomplete until evidence is available.
