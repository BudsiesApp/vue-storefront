# Redmine rollout notes for #36676

Storefront ecommerce events keep their existing names, firing points (except the readiness corrections below), and the `ecommerce: null` push before each event. When totals are available, event `value` and `currency` keep their current sources: grand total with quote or order currency for `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, and `purchase`; product or line price for `view_item`, `add_to_cart`, and `remove_from_cart`. Empty cart views omit value/coupon; the no-totals fallback does not invent them. Item fields follow the table in `design.md`.

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
- `add_to_cart` is reported only after the cart accepted the item: a product that is out of stock, fails validation, is rejected by the server, or is added to a cart that is no longer found on the server reports nothing. A cart-read or in-add totals 404 that clears the added change shows the same friendly translated cart-lost message, not Magento's raw text, and reconnects after the active synchronization. When the cart read fails with another error (for example a 500), the item stays in the cart for a later synchronization, the add behaves as before (no error) and the event is reported. It reports the synchronized cart line's price for the added quantity and the added product's categories; without a synchronized line, a bundle is priced with the options the customer selected. Previously an undiscounted product added with quantity 2 at 100 reported a unit price of 50, and taxed products reported gross amounts.
- Cart and order items without usable server item totals (an offline or unsynchronized cart) report tax-exclusive prices derived from their product data, and a bundle with the options the customer selected. Previously these items reported tax-inclusive prices; items with server totals are unchanged.
- A cart item whose paid price exceeds its base product price because of a paid option reports and displays the paid price instead of the base price. Item-event `value` still uses its existing price helper, so correcting that helper can also change the value for these paid-option items; this is not the net-item-revenue migration.
- Bundle campaign prices keep a free (zero-priced) child at zero and multiply child prices by their selection quantity, on product listings, product pages, and in analytics.
- A product or upgrade made free by a campaign is shown as free (its regular price struck through) instead of at its regular price, and product event values derived from the displayed price report 0.

Customer email hashes, on login, customer-data, plushie-wizard, and purchase pushes:

| Field | Before | After |
| --- | --- | --- |
| `customerEmailHashed` | SHA3-256 of the raw email, also for a blank email | SHA-256 of the trimmed, lowercased email; cleared (pushed as undefined) for a blank email, for example after logout |
| `customerEmailHashedSha3` | absent | SHA3-256 of the raw email (the previous `customerEmailHashed` value); cleared for a blank email |

For `buyer@example.com`: `customerEmailHashed` is `6a6c26195c3682faa816966af789717c3bfa834eee6c599d667d2b3429c27cfd` and `customerEmailHashedSha3` is `d4b9c0cb38c01dfbde5eedb8053b34ca3e180b4a0646a168b39e899474c00887`. Purchase hashes the order email.

Cart and checkout readiness:

- One client-only visit flow handles `view_cart` and standard `begin_checkout`. It waits for initial local restore and connection/pull, active Add (including stock/token work), cart synchronization, totals application, and coupon processing to settle. It reports once per mounted visit; later coupon/totals/login changes do not add another event. Leaving before settlement cancels the pending visit event without cancelling shared cart requests.
- After settlement, reuse totals successfully applied to the current quote. If an eligible nonempty cart has none, make one forced attempt; checkout's existing entry refresh counts as that attempt. No retry loop is added. A failed refresh can report last-known item prices, coupon, and grand total of the same quote. If none exist, report local items without an invented event value or coupon. Offline, disabled, or disconnected carts make no analytics totals request. An empty view reports `items: []` and neither the old coupon nor value.
- Checkout supplies the actual completion of its entry sequence, not an idle-state guess: send pending cart edits, then complete payment/method preparation and the existing forced totals refresh before reporting. Changing quantity and immediately entering checkout must send that edit before the totals request, even when the cart's quantity debounce is cancelled on unmount. Checkout does not spend its event in the earlier payment-details idle gap or issue an extra analytics retry after its entry refresh fails.
- Analytics no longer waits for a cart hash match. Shipping-estimate metadata and late catalog hydration cannot suppress a visit. Existing catalog/item-totals hash exclusions remain for ordinary synchronization; deploying those exclusions still causes one extra synchronization where the stored hash differs.
- Full totals-busy holds, quote/latest-response guards, synchronous response application, and deferred reconnect remain. Late totals responses cannot overwrite or clear a replacement quote, and replacement/clear invalidates the prior quote's totals and successful timestamp. A failed refresh alone no longer invalidates same-quote last-known totals.
- Standard checkout start excludes empty and success pages. A direct checkout URL request still redirects to the cart rather than emitting on SSR. Express-checkout `begin_checkout` keeps its trigger.

Unchanged by this refactor: first-named-category-only mapping and purchase `custom_fields.subtotal_value`/`affiliate_total` rounding. Their release decisions remain separate. Other pre-existing cart bugs are excluded except exception-safe Add completion and sending edits before checkout.

External verification pending: record GA4 DebugView purchase `value`, `shipping`, `tax`, `currency`, `coupon`, and item data. Add DebugView evidence to final Redmine notes; outgoing network requests alone do not establish DebugView receipt.
