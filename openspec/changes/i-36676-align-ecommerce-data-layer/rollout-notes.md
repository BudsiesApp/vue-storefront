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

- Coupon changes continue to refresh server item prices. Line and quote totals now apply synchronously, so a visit event cannot see a partially applied response.
- `add_to_cart` reports the accepted Add immediately with the line price from the item-write response, the added quantity, and the added product's categories. Without usable line totals it falls back to local pricing, including the selected bundle options. Genuine rejections are not reported; a cart-read 404 clears the cart and shows the friendly translated error. Another cart-read error keeps the local change and reports the Add. A subsequent background totals 404 may clear the cart after an accepted Add; it does not reject the Add or retract its event. The existing pending-coupon and first-quote waits are unchanged.
- Cart and order items without usable server item totals (an offline or unsynchronized cart) report tax-exclusive prices derived from their product data, and a bundle with the options the customer selected. Previously these items reported tax-inclusive prices; items with server totals are unchanged.
- A cart item whose paid price exceeds its base product price because of a paid option reports and displays the paid price instead of the base price. Item-event `value` still uses its existing price helper, so correcting that helper can also change the value for these paid-option items; this is not the net-item-revenue migration.
- Existing campaign display prices are unchanged. The new item mapping preserves free products and bundle selection quantities.

Customer email hashes, on login, customer-data, plushie-wizard, and purchase pushes:

| Field | Before | After |
| --- | --- | --- |
| `customerEmailHashed` | SHA3-256 of the raw email, also for a blank email | SHA-256 of the trimmed, lowercased email; cleared (pushed as undefined) for a blank email, for example after logout |
| `customerEmailHashedSha3` | absent | SHA3-256 of the raw email (the previous `customerEmailHashed` value); cleared for a blank email |

For `buyer@example.com`: `customerEmailHashed` is `6a6c26195c3682faa816966af789717c3bfa834eee6c599d667d2b3429c27cfd` and `customerEmailHashedSha3` is `d4b9c0cb38c01dfbde5eedb8053b34ca3e180b4a0646a168b39e899474c00887`. Purchase hashes the order email.

Cart and checkout readiness:

- `view_cart` and standard `begin_checkout` wait independently of the UI for startup, active Add, cart connection/sync, totals application, and coupon processing. They report once per mounted visit. Leaving cancels the event, not shared requests.
- Petsies, Budsies, Budsies Education, and Waggables reuse the current quote's business totals without analytics-specific requests or retries. The normal post-merge business refresh now runs when an empty cache is populated. If usable totals are unavailable, report local items without inventing value/coupon; empty carts report `items: []` without value/coupon.
- In-app checkout uses a component-local promise. If there are local edits, send them (and any pending coupon retry) without an intermediate methods/totals chain; then prepare payment and refresh once. With no edits, payment preparation starts without waiting for startup or cart idle. The mounted analytics handler waits for entry and emits nothing after leaving or turning into a success page.
- Standard and express payment require valid totals for the current quote at payment start and final submission. If a refresh failed and no usable totals remain, the shopper can refresh business totals and retry before payment state is consumed.
- Analytics does not require a cart hash match. Catalog hydration, item totals and shipment-estimate metadata are excluded from the ordinary sync hash, so they do not masquerade as unsent cart edits.
- Full totals-busy holds, quote/latest-response guards, synchronous response application, and deferred reconnect remain. Late totals responses cannot overwrite or clear a replacement quote, and replacement/clear invalidates the prior quote's totals and successful timestamp. A failed refresh alone no longer invalidates same-quote last-known totals.
- Standard checkout start excludes empty and success pages. A direct checkout URL request still redirects to the cart rather than emitting on SSR. Express-checkout `begin_checkout` keeps its trigger.

Existing cart races outside the stated edit-preservation requirements are out of scope.

External verification pending: record GA4 DebugView purchase `value`, `shipping`, `tax`, `currency`, `coupon`, and item data. Add DebugView evidence to final Redmine notes; outgoing network requests alone do not establish DebugView receipt.
