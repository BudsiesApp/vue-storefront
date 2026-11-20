# Spec Delta

## Purpose

Define the existing storefront ecommerce Data Layer's GA4-compatible item fields, event timing, and customer identifiers while preserving event value sources and non-GA integrations.

## ADDED Requirements

### Requirement: Event values keep their current sources

Existing ecommerce events SHALL keep their current `value` and `currency` sources when those values are available. Cart and checkout events SHALL use the cart grand total, purchase the order grand total, and item events the product or line price. The empty-cart and unavailable-totals reporting rules below SHALL NOT invent a replacement event value.

#### Scenario: Purchase value
- **WHEN** a confirmed purchase is reported
- **THEN** `value` is the order grand total and `currency` is the order currency
- **AND** shipping, tax, transaction ID, coupon, and items are reported separately
- **AND** shipping and tax are numeric, and an absent purchase coupon is reported as empty
- **AND** a grand total of 25.21 with shipping 6.95 and tax 2.06 reports `subtotal_value: 16.2`, not `16.200000000000003`
- **AND** purchase `custom_fields.subtotal_value` and `custom_fields.affiliate_total` remain rounded to cents

#### Scenario: Cart and checkout values
- **WHEN** `view_cart`, `begin_checkout`, `add_shipping_info`, or `add_payment_info` is emitted
- **THEN** when usable totals exist, `value` is the cart grand total and `currency` keeps its current source
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

Product and cart item payloads SHALL emit finite, non-negative, unlocalized, tax-exclusive unit `price` and numeric unit `discount`, zero when none applies, including merchandise discounts exactly once. The finite positive reported `quantity`, defaulting to 1, SHALL also derive the unit amounts. Latest applied server item totals SHALL take precedence, subject to the same-quote failure fallback below.

#### Scenario: Backend price already includes a coupon
- **WHEN** a backend item price already includes a transaction coupon discount
- **THEN** the payload uses that net price without subtracting the coupon a second time
- **AND** the monetary unit discount includes the applicable reduction
- **AND** this applies to cart, checkout, and purchase items, including transaction-level discounts allocated to items

#### Scenario: Custom totals across product types
- **WHEN** a simple or bundle cart or order item has server-calculated item totals
- **THEN** its unit price and unit discount derive from those totals
- **AND** standard row totals do not override its custom final price, and no further coupon subtraction or tax conversion is applied
- **AND** item amounts use unlocalized prices independently of the selected display currency

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
- **THEN** the cart is cleared with the local change, the add reports a friendly translated cart-lost error rather than the backend's raw message, and no `add_to_cart` event is reported
- **AND** when the shopper adds the product again, the line has the added quantity once and the add is reported

#### Scenario: Cart lost in the add's totals refresh
- **WHEN** the totals refresh within an add returns a cart-lost 404 and clears the added local change
- **THEN** the add has the same friendly translated error and no `add_to_cart` event as a cart-read 404
- **AND** the cart reconnects after the running synchronization settles

#### Scenario: Add operation rejects before cart synchronization
- **WHEN** an add's stock check or quote creation rejects while a cart view or checkout start is waiting
- **THEN** Add processing is released when the operation settles, and the Add button is not left disabled by that rejection
- **AND** the waiting page can finish its bounded event flow with the resulting cart

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
- **THEN** Redmine notes document before/after discount, category, and email-hash shapes and retained value/currency sources, including empty/no-totals omissions and same-quote failure fallback
- **AND** GA4 DebugView verifies purchase value, shipping, tax, coupon, currency, and items

### Requirement: Cart views wait for actual cart operations

Each client-side mounted cart-page visit SHALL emit at most one `view_cart` after initial restoration and connection, and active add, connection/pull, cart, totals, and coupon operations have settled, including failures. The event SHALL use current items and the bounded totals policy below, not a cart hash match. Visual loading SHALL remain independent of analytics readiness.

#### Scenario: Full reload with an applied coupon
- **WHEN** cached cart items load while the quote token, hash, or initial cart connection is still being restored
- **THEN** no cart view is emitted in the gaps before synchronization starts
- **AND** once the operations settle successfully, one view contains the applied coupon and synchronized item prices

#### Scenario: Empty local cache with a customer's full server cart
- **WHEN** a logged-in customer's restored local cart is empty and the initial connection is still fetching their server cart
- **THEN** no empty cart view is emitted while the connection or pull is pending
- **AND** after the pull brings items in without totals, the bounded totals attempt runs before reporting those items

#### Scenario: Startup or connection fails
- **WHEN** initial restore or an active connection rejects
- **THEN** its operation boundary still settles and does not leave the visit waiting forever
- **AND** the view follows the bounded totals policy with the resulting local cart

#### Scenario: Navigation and subsequent synchronization
- **WHEN** a cart page mounts with current-quote totals and no pending operations
- **THEN** it emits one cart view without an additional analytics refresh
- **AND** further synchronization, coupon changes, or login after a genuinely empty emitted view do not emit another view
- **AND** a new cart-page visit can emit its own view

#### Scenario: Add or coupon processing when navigating
- **WHEN** a cart or checkout page mounts while an add is still checking stock or creating a quote, or a coupon operation is active
- **THEN** the event waits for that entire operation, even before cart synchronization becomes busy
- **AND** on success it reports the resulting items and applied totals

#### Scenario: Metadata after shipping or catalog hydration
- **WHEN** shipping estimates change after shipping totals complete, or catalog hydration finishes before or after totals
- **THEN** metadata or a cart hash mismatch does not suppress the next cart view or checkout start
- **AND** any active shipping totals operation still completes before the event
- **AND** existing catalog/item-totals hash exclusions continue preventing unnecessary ordinary synchronization

#### Scenario: Empty cart after a prior coupon
- **WHEN** restored cart state is empty but the application previously held a cart value and coupon
- **THEN** its cart view contains `items: []` without `value` or `coupon`

#### Scenario: Server rendering or leaving before settlement
- **WHEN** a page is server rendered, or its client visit ends before event readiness
- **THEN** no cart/checkout visit event is emitted for that rendering or ended visit
- **AND** completion of a shared request later does not emit the ended visit's event or start its missing-totals request

### Requirement: Visit totals use a bounded same-quote policy

After required operations settle, cart views and standard checkout starts SHALL reuse successfully applied current-quote totals. An eligible nonempty cart without them SHALL make at most one analytics totals attempt per visit, unless checkout entry already attempted its refresh. Failed operations SHALL allow same-quote last-known totals, or local-item reporting without an invented event value or coupon. Another quote's totals SHALL NOT be reused.

#### Scenario: One attempt when no totals were loaded
- **WHEN** a nonempty connected online cart can synchronize totals but has none for its current quote
- **THEN** the visit makes one forced totals attempt and waits for completion
- **AND** a successful result is applied before the event uses its item prices, coupon, and value

#### Scenario: Failed attempt without last-known totals
- **WHEN** that attempt rejects, returns an error or unusable response, or fails during methods preparation before a totals request
- **THEN** the event is still emitted once after active work settles, using local items and no unavailable event value or coupon
- **AND** the visit does not loop, retry, or remain blocked waiting for a success

#### Scenario: Refresh fails after earlier successful totals
- **WHEN** an active refresh fails after a coupon change or another cart operation, and successful totals of the same quote exist
- **THEN** those last-known totals remain available and the visit reports them once after processing settles
- **AND** no failure-driven reset discards them or claims a new successful refresh

#### Scenario: Offline, disabled, or disconnected cart
- **WHEN** totals synchronization is offline or disabled, or the settled cart has no server connection
- **THEN** the visit makes no analytics totals request and reports local items
- **AND** it uses only available same-quote totals, without inventing missing event value or coupon

#### Scenario: Quote replaced or explicitly cleared
- **WHEN** quote B replaces quote A, or the cart is cleared
- **THEN** A's totals, coupon, and successful-totals evidence are invalidated for further reporting
- **AND** if B's attempt fails before B has totals, the event uses local items without A's value or coupon
- **AND** committing the unchanged quote identity does not discard that quote's totals

### Requirement: Totals refreshes retain cart correctness guards

Totals processing SHALL remain busy through method preparation, request completion, and synchronous application of item prices, totals, and successful-sync evidence. Only the latest-started refresh of the current quote SHALL apply a successful result. Missing-cart handling SHALL preserve replacement carts and defer reconnect behind an active synchronization rather than wait on itself.

#### Scenario: Refresh in progress when the page mounts
- **WHEN** a page mounts during a forced refresh after an earlier success
- **THEN** no event is emitted in a methods/request/application gap
- **AND** after success the event contains the newly applied prices and totals
- **AND** request failure releases all busy holds

#### Scenario: Overlapping refreshes
- **WHEN** a newer totals refresh starts before an older refresh finishes
- **THEN** the older response cannot overwrite the newer refresh's totals, regardless of response arrival order
- **AND** events wait until both operations settle
- **AND** if the newer refresh fails, only a previously applied same-quote result is available for fallback; the superseded response is not promoted

#### Scenario: Late response for a replaced quote
- **WHEN** a totals request for quote A returns success, failure, or a cart-lost 404 after quote B replaced it
- **THEN** B is not cleared, and its own item prices, totals, and successful-sync evidence are unchanged by A's response

#### Scenario: Missing current cart during synchronization
- **WHEN** a totals refresh reports the current quote missing while its cart synchronization waits for totals
- **THEN** the quote is cleared even if a newer refresh of that same quote started
- **AND** the synchronization finishes, releases busy state, and reconnects afterwards without a circular wait
- **AND** a waiting event includes the deferred reconnect in the work it waits to settle

### Requirement: Checkout start waits for its entry sequence

Standard `begin_checkout` SHALL use the shared visit flow and wait for checkout entry, including delivery of pending cart edits before the entry totals refresh. It SHALL emit once only for a mounted, nonempty, nonsuccess checkout visit. Express-checkout triggering SHALL remain unchanged, and missing totals SHALL NOT make checkout event handlers fail.

#### Scenario: Checkout's asynchronous idle gap
- **WHEN** checkout mounts while payment details are still being prepared and its entry refresh has not started
- **THEN** no `begin_checkout` is emitted in that idle interval, even if earlier totals exist
- **AND** after the entry operation and active work settle, it reports once using the resulting totals policy

#### Scenario: Quantity immediately followed by checkout
- **WHEN** the shopper changes quantity and enters checkout before the cart's one-second debounce runs
- **THEN** the edited quantity is sent to the server before checkout's forced totals request
- **AND** cart unmount does not cancel its only delivery or let that totals response restore the previous quantity
- **AND** `begin_checkout` reports the edited quantity and successful corresponding totals

#### Scenario: Checkout reuses its entry refresh
- **WHEN** checkout entry already attempted its refresh
- **THEN** analytics does not add another refresh, whether that attempt succeeded or failed
- **AND** failure follows the same-quote fallback policy
- **AND** when entry settles before attempting a refresh and current-quote totals are absent, the visit still has its one eligible attempt

#### Scenario: Empty, success, or direct server-rendered checkout
- **WHEN** checkout is empty or displays the success page
- **THEN** no standard `begin_checkout` is emitted
- **AND** a direct server request to checkout retains its redirect to the cart rather than emitting checkout start

#### Scenario: Missing totals in a checkout event
- **WHEN** a checkout event is emitted without usable totals
- **THEN** the event is pushed without throwing and does not invent a coupon or monetary total

### Requirement: Customer email hashes

Customer-identifying events SHALL report hexadecimal SHA-256 of the trimmed, lowercased email as `customerEmailHashed` and hexadecimal SHA3-256 of the raw email as `customerEmailHashedSha3`. A blank email SHALL clear both fields with undefined. Hash input SHALL come from the relevant event's customer, order, or wizard email, and push order SHALL remain unchanged.

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
- **AND** this includes cleared customer data after logout

#### Scenario: Customer-identifying push order
- **WHEN** login, customer-data, purchase, or wizard events identify a customer
- **THEN** login and customer-data pushes hash the customer's email, and the order of Data Layer pushes remains unchanged

#### Scenario: Purchase email differs from the account email
- **WHEN** an authenticated customer places an order with a different email
- **THEN** the purchase hashes the order email

#### Scenario: Wizard-supplied email
- **WHEN** the plushie wizard supplies a customer email
- **THEN** its event hashes the supplied email
