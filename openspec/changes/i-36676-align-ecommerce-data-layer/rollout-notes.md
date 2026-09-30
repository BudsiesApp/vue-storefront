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

GTM owner: inspect GA4 purchase and checkout parameter mappings so `value`, `currency`, `shipping`, `tax`, `coupon`, `transaction_id`, and `items` consume the corrected `ecommerce` paths. Inspect RTB House, Facebook, ShareASale, and other ecommerce consumers for reliance on the former grand-total `value`, discount object, or pipe-joined category string; update those mappings where necessary. The storefront GTM script source is unchanged.

Cart reload correction: `view_cart` now waits for successfully applied server totals and idle synchronization before reporting an online, nonempty cart, so its coupon and item revenue are available after a full reload. It reports once per mounted cart-page visit, including when navigating to a cart whose totals are already synchronized. Later totals/coupon changes do not add views, and leaving the page cancels a pending view. Empty carts and offline/disabled synchronization retain local-data reporting; failed initial online totals leave reporting pending until a successful synchronization. Include reload, navigation, and event-count checks in GTM Preview.

External verification pending: record GTM Preview payloads and counts for `begin_checkout`, `add_shipping_info`, `add_payment_info`, and `purchase`; confirm one event per intended action and a preceding `ecommerce: null` push. Record GA4 DebugView purchase `value`, `shipping`, `tax`, `currency`, `coupon`, and item data. Add actual container changes and evidence to final Redmine notes after the GTM owner validates them.
