# Redmine rollout notes for #36676

Storefront ecommerce events keep their existing names, firing points (except the readiness corrections below), and the `ecommerce: null` push before each event. Event `value` and `currency` keep their current sources: grand total with quote or order currency for `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, and `purchase`; product or line price for `view_item`, `add_to_cart`, and `remove_from_cart`. Item fields follow the table in `design.md`.

Example purchase: two units at 100 each, a coupon worth 20 in total, 12 shipping, and 8 tax:

| Field | Before | After |
| --- | --- | --- |
| `ecommerce.value` | `200` order grand total | unchanged: `200` order grand total |
| `ecommerce.currency` | order currency | unchanged |
| `ecommerce.shipping`, `ecommerce.tax` | `12`, `8` | unchanged |
| `ecommerce.items[0].price` | display-derived unit price | `90` discounted, tax-exclusive unit price |
| `ecommerce.items[0].discount` | `{ discount, discountPercent }` | `10` monetary discount per unit |
| `ecommerce.items[0].quantity` | raw cart quantity | `2`; invalid or missing quantities report `1` |
| `ecommerce.items[0].item_category` | pipe-joined category names | name of the first assigned category |
| `view_cart` → `ecommerce.coupon` | absent | applied coupon code from cart totals, when available |

The same `price`, `discount`, `quantity`, and category rules apply to all existing ecommerce events with items. Unit `price` and `discount` are rounded to four decimal places. Item `price` and `discount` no longer reconcile with `value`, which still includes shipping and tax. Purchase still carries `transaction_id`, `coupon`, `items`, `affiliation`, and `custom_fields` (`shareasale_sscid`, `is_new_customer`, `subtotal_value`, `affiliate_total`); `subtotal_value` and `affiliate_total` are now rounded to cents. Checkout still carries `coupon`, `shipping_tier`, `payment_type`, and the express-checkout custom field. Item `item_id`, `item_internal_id`, `item_variant`, and `purchase_flow` remain available.

Item pricing corrections:

- After a coupon is applied or removed without a page reload, cart line prices and the items of later cart, checkout, and purchase events use the recalculated server item totals instead of the values from the last cart load.
- `add_to_cart` is reported only after the cart accepted the item: a product that is out of stock, fails validation, is rejected by the server, or whose synchronization fails because the cart cannot be read reports nothing. In that last case the add now also shows an error, where it used to fail silently. It reports the synchronized cart line's price for the added quantity and the added product's categories; without a synchronized line, a bundle is priced with the options the customer selected. Previously an undiscounted product added with quantity 2 at 100 reported a unit price of 50, and taxed products reported gross amounts.
- Cart and order items without usable server item totals (an offline or unsynchronized cart) report tax-exclusive prices derived from their product data, and a bundle with the options the customer selected. Previously these items reported tax-inclusive prices; items with server totals are unchanged.
- A cart item whose paid price exceeds its base product price because of a paid option reports and displays the paid price instead of the base price.
- Bundle campaign prices keep a free (zero-priced) child at zero and multiply child prices by their selection quantity, on product listings, product pages, and in analytics.
- A product or upgrade made free by a campaign is shown as free (its regular price struck through) instead of at its regular price, and product event values derived from the displayed price report 0.

Customer email hashes, on login, customer-data, plushie-wizard, and purchase pushes:

| Field | Before | After |
| --- | --- | --- |
| `customerEmailHashed` | SHA3-256 of the raw email, also for a blank email | SHA-256 of the trimmed, lowercased email; cleared (pushed as undefined) for a blank email, for example after logout |
| `customerEmailHashedSha3` | absent | SHA3-256 of the raw email (the previous `customerEmailHashed` value); cleared for a blank email |

For `buyer@example.com`: `customerEmailHashed` is `6a6c26195c3682faa816966af789717c3bfa834eee6c599d667d2b3429c27cfd` and `customerEmailHashedSha3` is `d4b9c0cb38c01dfbde5eedb8053b34ca3e180b4a0646a168b39e899474c00887`. Purchase hashes the order email.

Cart and checkout readiness:

- `view_cart` waits for successfully applied server totals and idle synchronization before reporting an online, nonempty cart, so its coupon and item prices are available after a full reload. It reports once per mounted cart-page visit. Later totals or coupon changes do not add views, and leaving the page cancels a pending view. Empty carts and offline or disabled synchronization keep local-data reporting. Catalog data that loads after the totals no longer blocks the report. After deployment, each visitor's stored cart hash is recalculated once, which triggers one extra cart synchronization. A totals refresh that only changes item prices (a shipping address that applies a country cart rule, a forced refresh) no longer blocks the next `view_cart` or `begin_checkout`, and a page mounted while such a refresh is in progress reports once, with the refreshed prices. When a totals refresh fails, for example after a coupon the server already accepted, the earlier totals are no longer treated as synchronized: `view_cart` and `begin_checkout` wait for a later successful refresh instead of reporting the old coupon and prices, and are not reported for that visit if every refresh fails. When refreshes overlap (a coupon change during an address lookup), the response of the refresh that started last decides the totals, so a late response of an older refresh can no longer overwrite the discounted prices.
- `begin_checkout` from the checkout page follows the same readiness rules and reports once per visit, for a nonempty cart. Previously it was lost whenever the checkout page mounted before the first server totals response of the page session, for example when navigating to checkout right after a full load of another page. A direct load of the checkout URL redirects to the cart. Express-checkout `begin_checkout` keeps its trigger.

External verification pending: record GA4 DebugView purchase `value`, `shipping`, `tax`, `currency`, `coupon`, and item data. Add DebugView evidence to final Redmine notes; outgoing network requests alone do not establish DebugView receipt.
