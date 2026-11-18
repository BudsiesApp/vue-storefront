# Spec Delta

## Purpose

Define the existing storefront ecommerce Data Layer's GA4-compatible item fields, event timing, and customer identifiers while preserving event value sources and non-GA integrations.

## ADDED Requirements

### Requirement: Event values keep their current sources

Existing ecommerce events SHALL keep their current `value` and `currency` sources. `view_cart`, `begin_checkout`, `add_shipping_info`, and `add_payment_info` SHALL report the cart grand total; `purchase` SHALL report the order grand total with the order currency; `view_item`, `add_to_cart`, and `remove_from_cart` SHALL report the product or line price. Purchase SHALL retain its transaction ID, coupon (empty when absent), items, and separate numeric shipping and tax fields. Its `custom_fields.subtotal_value` and `custom_fields.affiliate_total` SHALL be rounded to cents.

#### Scenario: Purchase value
- **WHEN** a confirmed purchase is reported
- **THEN** `value` is the order grand total and `currency` is the order currency
- **AND** shipping, tax, transaction ID, coupon, and items are reported separately
- **AND** a grand total of 25.21 with shipping 6.95 and tax 2.06 reports `subtotal_value: 16.2`, not `16.200000000000003`

#### Scenario: Cart and checkout values
- **WHEN** `view_cart`, `begin_checkout`, `add_shipping_info`, or `add_payment_info` is emitted
- **THEN** `value` is the cart grand total and `currency` keeps its current source
- **AND** the sum of item revenue is not required to equal `value`

#### Scenario: Item event values
- **WHEN** `view_item`, `add_to_cart`, or `remove_from_cart` is emitted
- **THEN** `value` is the product price or the price of the added or removed line
- **AND** `add_to_cart` keeps deriving `value` from the cart item price of the added product, independently of the synchronized line used for its item

#### Scenario: Applied coupon in cart views
- **WHEN** a `view_cart` event is emitted for a cart with an applied coupon
- **THEN** `ecommerce.coupon` contains the applied code from the event's cart totals
- **AND** a later cart view after coupon removal does not retain the old code

### Requirement: Item prices and discounts are unit monetary values

Existing product and cart item payloads SHALL emit a numeric, discounted, tax-exclusive unit `price` and a numeric unit `discount`, with zero discount when none applies. Cart, checkout, and purchase items SHALL include backend-applied merchandise discounts exactly once, including transaction-level discounts allocated to items, and SHALL reflect the latest server-calculated item totals. Item amounts SHALL use unlocalized prices independently of the selected display currency. Emitted amounts SHALL be finite and non-negative, and the reported `quantity` SHALL be the same quantity used to derive unit amounts. Product and cart item events SHALL report a finite positive quantity, defaulting to 1.

#### Scenario: Backend price already includes a coupon
- **WHEN** a backend item price already includes a transaction coupon discount
- **THEN** the payload uses that net price without subtracting the coupon a second time
- **AND** the monetary unit discount includes the applicable reduction

#### Scenario: Custom totals across product types
- **WHEN** a simple or bundle cart or order item has server-calculated item totals
- **THEN** its unit price and unit discount derive from those totals
- **AND** standard row totals do not override its custom final price, and no further coupon subtraction or tax conversion is applied

#### Scenario: Cart item without complete item totals
- **WHEN** a cart or order item has no server-calculated item totals, or totals without a regular or a final price, for example in an offline or unsynchronized cart
- **THEN** its unit price and unit discount derive from its product data with tax removed once: a taxed item with net price 80, gross price 96, and gross original price 120 reports `price: 80` and `discount: 20` at any quantity
- **AND** a bundle is priced with the options the customer selected

#### Scenario: Prices after a coupon change
- **WHEN** two cart units priced 100 each receive a coupon worth 20 in total, without a page reload
- **THEN** later cart, checkout, and purchase items report `price: 90`, `discount: 10`, and `quantity: 2`
- **AND** after the coupon is removed without a reload, items report `price: 100` and `discount: 0`

#### Scenario: Paid surcharge above the base price
- **WHEN** a cart item's base unit price is 100 and a paid option raises its paid unit price to 125
- **THEN** the item reports `price: 125` and `discount: 0`

#### Scenario: Bundle with a free campaign child
- **WHEN** a bundle product's default child has a campaign final price of 0, with a regular gross price of 120 and 20% tax
- **THEN** the item reports `price: 0` and `discount: 100`
- **AND** a child with a selection quantity greater than one contributes its price multiplied by that quantity

#### Scenario: Invalid cart item quantity
- **WHEN** a cart item quantity is zero, negative, missing, non-numeric, NaN, or infinite
- **THEN** the item reports `quantity: 1` and the unit `price` and `discount` of one unit
- **AND** a numeric string quantity is reported as its number and used for unit amounts

#### Scenario: Non-numeric amounts or product quantity
- **WHEN** item totals or catalog prices are NaN, infinite, or non-numeric, or a product event's quantity is missing, zero, NaN, or infinite
- **THEN** the item reports `price: 0` and `discount: 0` for the invalid amounts
- **AND** the product item reports `quantity: 1`, and a numeric string quantity is reported as its number

#### Scenario: Quantity and rounding
- **WHEN** a discounted line has multiple units and its total discount does not divide evenly into currency minor units
- **THEN** unit amounts retain enough precision for the line revenue to reconcile after currency rounding
- **AND** unit `price` and `discount` are rounded to four decimal places, without floating-point noise such as `0.9000000000000009`
- **AND** `discount` is a number rather than a percentage or an object

#### Scenario: Product without a discount
- **WHEN** an undiscounted product is included in an existing product event
- **THEN** its tax-exclusive unit price is emitted with `discount: 0`

#### Scenario: Taxed catalog products and unit-price resolution
- **WHEN** catalog product prices include nonzero tax, with or without a special price or campaign override
- **THEN** item price and discount are tax-exclusive unit amounts with tax removed exactly once
- **AND** raw `regular_price`, cached display getter amounts, and product quantity do not change their monetary basis
- **AND** default bundle-option pricing, gift-card amounts, and zero-valued campaign overrides remain supported

### Requirement: Added cart items use synchronized pricing

`add_to_cart` SHALL be reported only after the cart accepted the item: the add is not rejected locally and the server did not reject it. It SHALL map its item from the server-synchronized cart line of the added product, report the added quantity, and report the added product's categories. When that line has no server-calculated item totals, the item SHALL use the tax-exclusive unit price derived from the product data and, for a bundle, from the options the customer selected.

#### Scenario: Undiscounted product with quantity two
- **WHEN** a product with a unit price of 100 is added with quantity 2
- **THEN** the item reports `price: 100`, `discount: 0`, and `quantity: 2`

#### Scenario: Discounted taxed product
- **WHEN** a product with net price 80, gross price 96, and gross original price 120 is added
- **THEN** the item reports `price: 80` and `discount: 20`

#### Scenario: Adding to an existing line
- **WHEN** a product already in the cart is added again
- **THEN** the item reports only the added quantity

#### Scenario: Add rejected by the server
- **WHEN** the server rejects the added item, for example with "Provided email is not valid"
- **THEN** no `add_to_cart` event is reported

#### Scenario: Cart read fails during the synchronization
- **WHEN** the cart cannot be read from the server during the synchronization of the add, for example with a 500, so the item has not reached the server yet
- **THEN** the item is not rejected: it stays in the cart for a later synchronization, the add shows no error, and `add_to_cart` is reported
- **AND** the quantity of the line is the added quantity once, also for an increase of a line that is already in the cart

#### Scenario: Cart not found during the synchronization
- **WHEN** the cart is no longer found on the server during the synchronization of the add
- **THEN** the cart is cleared with the local change, the add reports an error, and no `add_to_cart` event is reported
- **AND** when the shopper adds the product again, the line has the added quantity once and the add is reported

#### Scenario: Add rejected locally
- **WHEN** the cart does not add the item, for example because it is out of stock or fails validation, including a quantity increase of a line that is already in the cart
- **THEN** no `add_to_cart` event is reported
- **AND** an item added with only a stock warning is still reported

#### Scenario: Bundle without item totals
- **WHEN** a bundle whose default child costs 80 (regular 100) is added with a selected child that costs 120 (regular 140), and the cart line has no item totals
- **THEN** the item reports `price: 120` and `discount: 20`
- **AND** product and listing events of the same bundle keep the default option prices

#### Scenario: Categories of the added product
- **WHEN** the synchronized cart line does not yet carry categories
- **THEN** the item reports the categories of the added product

### Requirement: Items report one category level

Item payloads SHALL report the name of the first named category assigned to the product as `item_category` and SHALL NOT report `item_category2` through `item_category5`, because product data does not identify the category hierarchy. Payloads SHALL NOT join category names into one field.

#### Scenario: Several assigned categories
- **WHEN** a product is assigned to "Accessories for Custom Products" and then "Petsies Accessories"
- **THEN** the item reports `item_category: "Accessories for Custom Products"` and no further category levels

#### Scenario: Missing or nameless categories
- **WHEN** a product has no categories, or only categories without a name
- **THEN** the item reports no category fields

### Requirement: Existing event and integration behavior is preserved

Payload updates SHALL preserve existing event names and firing points, except for the cart-view and checkout-start readiness corrections below, as well as SKU, internal ID, composed variant, and purchase-flow reporting and integration-specific custom fields. Each intended event emission SHALL continue to clear stale `ecommerce` data immediately before its payload push without introducing additional event pushes. GTM loading through the configured script source SHALL remain supported.

#### Scenario: Checkout funnel and purchase verification
- **WHEN** the existing checkout actions complete and an order is placed
- **THEN** `begin_checkout`, `add_shipping_info`, `add_payment_info`, and `purchase` retain their intended event counts
- **AND** each event follows an `ecommerce: null` push
- **AND** item identifiers and variants remain unchanged

#### Scenario: Customized bundle variant
- **WHEN** a customized bundle with several selected option SKUs is reported
- **THEN** `item_variant` is its composed SKU and `item_internal_id` and `purchase_flow` are reported

#### Scenario: Consumer migration and Analytics receipt
- **WHEN** the payload correction is prepared for rollout
- **THEN** Redmine notes document before/after discount, category, and email-hash shapes and state that value and currency are unchanged
- **AND** GA4 DebugView verifies purchase value, shipping, tax, coupon, currency, and items

### Requirement: Cart views wait for synchronized totals

An online, nonempty cart SHALL report `view_cart` only after the page mounts, local cart data loads, successful server totals have been applied during the application session, totals no longer require synchronization, and cart, totals, and coupon processing are idle. Each mounted cart-page visit SHALL emit at most one view using its current items and totals. Visual loading behavior SHALL remain independent of analytics readiness.

#### Scenario: Full reload with an applied coupon
- **WHEN** cached cart items load while server totals are still pending
- **THEN** no cart view is emitted yet
- **AND** after successful totals application and synchronization completion, one cart view contains the applied coupon and synchronized item prices

#### Scenario: Navigation and subsequent synchronization
- **WHEN** a cart page mounts with already synchronized totals
- **THEN** it emits one cart view
- **AND** further synchronization or coupon changes during that visit do not emit another view
- **AND** a new cart-page visit can emit its own view

#### Scenario: Catalog data refreshed after totals
- **WHEN** a cart synchronization finishes its totals before the product catalog data refresh, or after it
- **THEN** the cart view and the checkout start are reported once synchronization is idle in both orders
- **AND** catalog fields added to cart items (categories, descriptions, media, catalog prices) do not mark totals as requiring synchronization

#### Scenario: Totals refreshed without a cart merge
- **WHEN** a totals refresh outside a coupon action or a cart merge, for example after a shipping address change, changes an item price
- **THEN** totals do not remain marked as requiring synchronization
- **AND** the next cart view and checkout start are reported with the refreshed prices

#### Scenario: Refresh in progress when the page mounts
- **WHEN** a cart page or checkout page mounts while a forced totals refresh is in progress, after an earlier successful synchronization
- **THEN** no event is emitted until the response is applied: its items, totals, and sync timestamp
- **AND** the single event then contains the refreshed prices and totals, also when the refresh includes a payment-methods pull before the totals request
- **AND** the syncing state is released when the request fails

#### Scenario: Totals refresh fails
- **WHEN** a totals refresh fails (a rejected request, an error response, a response that cannot be applied, or a failure before the totals request such as in the payment-methods pull), for example after a coupon the server already accepted
- **THEN** the earlier totals are not treated as synchronized and no cart view or checkout start is emitted with them
- **AND** once a later refresh succeeds, one event is emitted with the refreshed prices and totals
- **AND** a cart that is no longer found is cleared as before and keeps its synchronization state

#### Scenario: Overlapping totals refreshes
- **WHEN** a totals refresh is still in flight when a newer refresh starts, for example after a coupon change, and the older response arrives after the newer one, or before it
- **THEN** the totals of the newer refresh are kept and the older response is not applied
- **AND** a failure of the older refresh does not invalidate the totals of the newer one, while a failure of the newer refresh does
- **AND** an event is emitted only once every refresh has finished, with the totals of the newer refresh

#### Scenario: Cart not found for a cart that was replaced
- **WHEN** a totals refresh of a cart answers that the cart was not found after another cart replaced it, for example after the customer's cart was connected again
- **THEN** the current cart is not cleared and its totals stay synchronized
- **AND** a not-found answer for the cart that is still the current one clears it as before

#### Scenario: Totals response for a cart that was replaced
- **WHEN** a totals refresh of a cart succeeds or fails after another cart replaced it, for example after a reconnect to another quote, and no newer refresh has started
- **THEN** the response is not applied: the current cart keeps its own item prices and totals and is not marked as synchronized by it
- **AND** the failure of the request does not invalidate the totals of the current cart
- **AND** line prices, totals and the sync date of an applied response are written together, without waiting in between

#### Scenario: Cart not found during a synchronization that waits for the totals
- **WHEN** a cart synchronization waits for a totals refresh and the refresh answers that the cart was not found
- **THEN** the synchronization finishes, the totals are no longer marked as syncing, and the cart is cleared and disconnected
- **AND** the cart is reconnected after that synchronization finished, not from within it

#### Scenario: Leaving before totals are ready
- **WHEN** the cart page is destroyed before synchronization completes
- **THEN** later totals completion does not emit a view for the previous visit

#### Scenario: Empty, offline, or failed synchronization
- **WHEN** the cart is empty or server totals synchronization is disabled or offline
- **THEN** a mounted, locally loaded cart reports its view when processing is idle without requiring a successful totals timestamp
- **AND** an online, nonempty cart without a successful totals response waits for a later successful synchronization

### Requirement: Checkout start waits for synchronized totals

The checkout page SHALL report `begin_checkout` at most once per mounted visit, for a nonempty cart, using the same readiness conditions as cart views. Express-checkout `begin_checkout` SHALL keep its trigger. Checkout events SHALL be reported without failing when cart totals are unavailable.

#### Scenario: Checkout page loaded before totals
- **WHEN** an in-app navigation mounts the checkout page before the first server totals response of the page session, for example right after a full load of another page
- **THEN** no `begin_checkout` is emitted yet
- **AND** after totals are applied and synchronization is idle, one `begin_checkout` contains the cart items, coupon, and value

#### Scenario: Checkout page with synchronized totals
- **WHEN** the checkout page mounts with already synchronized totals
- **THEN** it emits one `begin_checkout`, and later synchronization during that visit emits no other

#### Scenario: Empty cart
- **WHEN** the checkout page mounts for an empty cart
- **THEN** no `begin_checkout` is emitted

#### Scenario: Missing totals
- **WHEN** a checkout event is emitted while cart totals are unavailable
- **THEN** the event is still pushed, without a coupon

### Requirement: Customer email hashes

Customer-identifying events SHALL report `customerEmailHashed` as the hexadecimal SHA-256 digest of the email after trimming surrounding whitespace and lowercasing it, and `customerEmailHashedSha3` as the hexadecimal SHA3-256 digest of the email exactly as provided. When the email is blank after trimming, the push SHALL set both fields to undefined so that values from earlier pushes are cleared from the Data Layer, for example after logout. Purchase SHALL hash the order email, the plushie wizard SHALL hash the email it supplies, and login and customer-data events SHALL hash the customer's email. The order of Data Layer pushes SHALL NOT change.

#### Scenario: Known digests
- **WHEN** the email is `buyer@example.com`
- **THEN** `customerEmailHashed` is `6a6c26195c3682faa816966af789717c3bfa834eee6c599d667d2b3429c27cfd`
- **AND** `customerEmailHashedSha3` is `d4b9c0cb38c01dfbde5eedb8053b34ca3e180b4a0646a168b39e899474c00887`

#### Scenario: Case and whitespace
- **WHEN** the email is ` Buyer@Example.COM `
- **THEN** `customerEmailHashed` equals the digest for `buyer@example.com`
- **AND** `customerEmailHashedSha3` is the SHA3-256 digest of the unmodified value

#### Scenario: Blank email
- **WHEN** the email is empty or contains only whitespace
- **THEN** the push sets `customerEmailHashed` and `customerEmailHashedSha3` to undefined
- **AND** the Data Layer no longer returns hashes from earlier pushes

#### Scenario: Purchase email differs from the account email
- **WHEN** an authenticated customer places an order with a different email
- **THEN** the purchase hashes the order email

#### Scenario: Wizard-supplied email
- **WHEN** the plushie wizard supplies a customer email
- **THEN** its event hashes the supplied email
