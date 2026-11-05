# Redmine rollout notes for #36676

Storefront ecommerce events keep their existing names and clear `ecommerce` before each push. The item fields and monetary values now follow the table in `design.md`. Reporting always uses USD, independently of the shopper's selected display currency. Example purchase in USD: two items at 100 each, a 20 item discount, 12 shipping, and 8 tax:

| Field | Before | After |
| --- | --- | --- |
| `ecommerce.value` | `200` from grand total | `180` from `90 × 2`, excluding shipping and tax; round the sum to two decimals |
| `ecommerce.currency` | quote/order currency | always `USD`; all corrected ecommerce amounts use USD |
| `ecommerce.shipping` | base-currency shipping | retain `12` from existing USD `base_shipping_amount` |
| `ecommerce.tax` | base-currency tax | retain `8` from existing USD `base_tax_amount` |
| `view_cart` → `ecommerce.coupon` | absent | applied coupon code from cart totals, when available |
| `ecommerce.items[0].price` | display-derived unit price | `90` discounted, tax-exclusive unit price |
| `ecommerce.items[0].discount` | `{ discount, discountPercent }` | `10` monetary discount per unit |
| `ecommerce.items[0].item_category` | pipe-joined category names | first known category name |
| `ecommerce.items[0].item_category2`–`item_category5` | absent | successive known ancestor levels, when available |

The same `value`, `price`, and `discount` rules apply to existing `view_cart`, `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `add_shipping_info`, and `add_payment_info` events. Purchase still carries `transaction_id`, `coupon`, `items`, `affiliation`, and `custom_fields` (`shareasale_sscid`, `is_new_customer`, `subtotal_value`, `affiliate_total`). Checkout still carries the applied `coupon`, `shipping_tier`, `payment_type`, and express-checkout custom field. Item `item_id`, `item_internal_id`, `item_variant`, `quantity`, and `purchase_flow` remain available.

Cart/order prices reuse the existing unlocalized price helper and its `budsies_quote_item_totals` source for both simple and bundle items. The mapper divides line amounts by quantity and extracts the numeric monetary discount; it does not recalculate standard row totals, subtract coupons again, or apply another tax conversion.

GTM container change status: no web or server GTM container changes were applied as part of this work. The exported configurations were reviewed and sampled outgoing GA4 requests were inspected. The existing GA4 ecommerce tags consume the corrected Data Layer values. Shared `value`, `discount`, and category semantics change for non-GA consumers as described above; integration-specific custom fields remain available. The storefront GTM script source is unchanged.

Cart reload correction: `view_cart` now waits for successfully applied server totals and idle synchronization before reporting an online, nonempty cart, so its coupon and item revenue are available after a full reload. It reports once per mounted cart-page visit, including when navigating to a cart whose totals are already synchronized. Later totals/coupon changes do not add views, and leaving the page cancels a pending view. Empty carts and offline/disabled synchronization retain local-data reporting; failed initial online totals leave reporting pending until a successful synchronization.

External verification pending: record GA4 DebugView purchase `value`, `shipping`, `tax`, `currency`, `coupon`, and item data. Add DebugView evidence to final Redmine notes; outgoing network requests alone do not establish DebugView receipt.

Catalog product pricing: unit prices now resolve directly from existing product/default-option and campaign pricing sources, bypassing cached display getters. Known tax-inclusive unit amounts are converted using current/original net-to-gross price pairs; quantity is applied only to event revenue. This prevents double tax removal or quantity division when raw catalog `regular_price` is present. Cart/order mapping and GTM configuration are unchanged by this follow-up.
