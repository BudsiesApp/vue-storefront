# Tasks

## 1. Correct existing ecommerce fields

- [x] 1.1 Implement the `items[].price` and `items[].discount` rows in `design.md`'s Data Layer field table; reuse the existing cart price helper and map its line amounts to unit price and numeric unit discount, removing duplicate row-total/bundle calculations. Verify simple/bundle custom totals, quantities, combined discounts, zero prices, and rounding without double subtraction.
- [x] 1.2 Restore the previous `value` and `currency` expressions in every ecommerce handler and remove the item-revenue value helper and its tests; verify listener tests assert grand total with quote/order currency for cart, checkout, and purchase, and product or line price for item events.
- [x] 1.3 Implement the table's `item_category` through `item_category5` row in the existing category/base-item mapping; verify ancestry order, unrelated categories, missing categories, and unchanged item IDs/internal IDs/composed variants.
- [x] 1.4 Replace the cart page's loading watcher with a focused composable using the existing successful-totals timestamp and idle synchronization state; emit once per mounted visit using current items/totals, preserve visual loading, and handle empty/offline carts without additional requests.

## 2. Verify the payload correction

- [x] 2.1 Add listener-level regression coverage for the four checkout/purchase events and the existing ecommerce clearing factory; verify one payload push per intended emission, preceding `ecommerce: null`, existing event names/metadata, and separate purchase shipping/tax.
- [x] 2.2 Run the focused GTM Jest suite, changed-file ESLint, and `yarn type-check`; record results and confirm the diff is limited to payload mapping, cart-view readiness, and tests, with GTM script-source configuration preserved. (`vue-tsc --noEmit -p tsconfig.vue-tsc.json` was run directly because the installed global Yarn is 1 while this project declares Yarn 4.)
- [x] 2.3 Add reactive lifecycle regression coverage for reload before totals arrive, already synchronized navigation, repeated synchronization, coupon-free carts, empty/offline carts, failed initial totals, and destruction before completion; run focused tests, changed-file lint, and type checking. (29 focused tests passed across six suites, including existing-helper cart mapping coverage; changed-file ESLint and the project's direct `vue-tsc` command passed.)

## 3. Document the rollout and verify Analytics receipt

- [x] 3.1 Update the Redmine-ready before/after examples for discount, category, coupon, and email-hash fields, stating that value and currency are unchanged; verify every changed field path and retained custom field is listed.
- [ ] 3.3 Obtain GA4 DebugView evidence for purchase revenue, shipping, tax, currency, coupon, and items; incorporate results into the final Redmine notes, keeping external checks incomplete until evidence is available.

## 4. Make catalog product pricing explicit

- [x] 4.1 Resolve tax-exclusive product unit prices independently of cached display getters; preserve default bundle/campaign/gift-card pricing, zero overrides, and quantity-independent unit values.
- [x] 4.2 Add regression coverage using real pricing resolvers for taxed/untaxed products, discounts, quantity, raw regular-price presence, and default-option overrides; run focused tests, lint, type checking, and OpenSpec validation. (38 tests passed across six suites; changed-file ESLint, vue-tsc, and strict OpenSpec validation passed.)

## 5. Apply review corrections

- [x] 5.1 Refresh `budsies_quote_item_totals` in `overrideServerTotals` by merging into existing `extension_attributes` (Decision 3); verify with action tests for coupon apply, coupon removal, a response without item totals, and preserved plushie/flow/customization data.
- [x] 5.2 Include positive `savings_amount` in `getCartItemPrice`'s regular price and add `savings_amount`/`discount_amount` to the item-totals type (Decision 3); verify tests for no discount, sale price, coupon, sale price plus coupon, paid option, paid option plus coupon, dynamic bundle, gift card, missing `savings_amount`, and quantity above one.
- [x] 5.3 Keep zero prices and apply selection quantities in bundle campaign pricing (Decision 4); verify tests for a free child, a mixed bundle, selection quantity above one, and the 20%-tax item example (`price: 0`, `discount: 100`).
- [x] 5.4 Normalize cart item quantity once (Decision 2); verify mapper tests for zero, negative, missing, numeric-string, non-numeric, NaN, and infinite quantities.
- [x] 5.5 Map `add_to_cart` from the synchronized line with the action quantity and the added product's categories, with the net product-price fallback (Decision 5); verify through the real `cart/addItem` flow: undiscounted quantity 2, the discounted taxed product, adding to an existing line, and a line without item totals.
- [x] 5.6 Verify category ancestry on the selected branch (Decision 6); verify the duplicate-slug example, malformed paths, ties, and existing ancestry tests.
- [x] 5.7 Add a listener test for a customized bundle with several option SKUs without mocking the customization selector; verify `item_variant`, `item_internal_id`, and `purchase_flow`.
- [x] 5.8 Add `js-sha256` and the email-hash helper at all three call sites (Decision 8); verify the known digests, case/whitespace equivalence, blank email omitting both fields, purchase email different from the account email, wizard override, and unchanged push order.
- [x] 5.9 Share cart readiness between the cart and checkout pages and emit `begin_checkout` once per ready, nonempty checkout visit; guard null `platformTotals` in checkout handlers (Decision 7); verify composable/page tests for a load before totals, synchronized navigation, an empty cart, destruction before readiness, and handlers with null totals.
- [x] 5.10 Run the focused suites, changed-file ESLint, `vue-tsc --noEmit -p tsconfig.vue-tsc.json`, and `openspec validate i-36676-align-ecommerce-data-layer --strict`; record the results. (93 tests passed across 12 suites: the GTM module, `getCartItemPrice`, bundle campaign prices, the totals item refresh, and the cart-view, begin-checkout, and DetailedCart readiness specs. Changed-file ESLint reported no errors, only an existing `vue/no-lone-template` warning in `Checkout.vue`; `vue-tsc` and strict OpenSpec validation passed. The legacy `totalsActions.spec.ts` suite does not load in the current test environment, so the refresh is covered by the focused `totals-item-refresh.spec.ts`.)

## 6. Apply browser-test corrections

- [x] 6.1 Push both email-hash fields as `undefined` for a blank email so GTM clears earlier values (Decision 8); verify helper and listener tests for blank emails, and in the browser that `google_tag_manager[...].dataLayer.get('customerEmailHashed')` returns undefined after a blank-email push.
- [x] 6.2 Round unit `price` and `discount` to four decimal places in the cart and product mappers (Decision 2); verify a mapper test with a 24.95/17.955 line reporting `price: 17.955` and `discount: 6.995`.
- [x] 6.3 Correct the `begin_checkout` wording in the spec, design, and rollout notes: a direct checkout request redirects to the cart, so only in-app navigation before the first totals response was affected; verify with strict OpenSpec validation.
- [x] 6.4 Treat a finite campaign final price of 0 as present in `getProductPrice` (Decision 4); verify `getProductDefaultPrice` tests for a free upgrade, a non-zero campaign price, no campaign price, and a bundle with a free default child, and in the browser that the `memory_pocket` upgrade's displayed price is `{ regular: 15, special: 0 }` with campaign 180.
- [x] 6.5 Report only the first named category as `item_category`, replacing the ancestry logic from 1.3 and 5.6 (Decision 6), because product data has no category paths; verify mapper tests for several categories, nameless categories, and no categories.
- [x] 6.6 Default a missing, zero, negative, or non-numeric bundle selection quantity to 1 in bundle campaign prices (Decision 4); verify bundle campaign price tests for each case.
- [x] 6.7 Skip `add_to_cart` when a server response of the add failed (Decision 5); verify `add_to_cart` tests through `cart/addItem` for a rejected and an accepted add.
- [x] 6.8 Round purchase `custom_fields.subtotal_value` and `affiliate_total` to cents (Decision 1); verify a listener test with grand total 25.21, shipping 6.95, and tax 2.06 reporting `subtotal_value: 16.2`.
- [x] 6.9 Verify special-price cases in the browser after reindexing: a simple product and an upgrade with a special price, and a simple product, an upgrade, and a bundle size with both a special price and a campaign discount; check displayed prices, cart line totals, and item `price`/`discount` in `view_item`, `add_to_cart`, `view_cart`, and checkout events.
- [x] 6.10 Restore the `add_to_cart` `value` source to the cart item price getter for the added product, keeping the synchronized line only for the item (Decision 5); verify an `add_to_cart` test asserting the getter is called with the added product and its result is the event value.
- [x] 6.11 Normalize quantities in both item mappers (cart: invalid is 0; product: invalid is 1) and report non-finite or non-positive unit amounts as 0 (Decision 2); verify mapper tests for NaN, infinite, and non-numeric totals and product quantities.
- [x] 6.12 Exclude the catalog fields written by the product-data refresh from the cart hash (Decision 7) so a late catalog refresh cannot block `view_cart` and `begin_checkout`; verify a readiness test through the real cart merge for both completion orders (catalog last and totals last) and `calcItemsHmac` tests for ignored catalog fields and hash-relevant changes.

