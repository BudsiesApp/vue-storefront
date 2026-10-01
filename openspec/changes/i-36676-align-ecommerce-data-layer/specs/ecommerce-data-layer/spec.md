# Spec Delta

## Purpose

Define the existing storefront ecommerce Data Layer's GA4-compatible monetary and category fields while preserving event behavior and non-GA integrations.

## ADDED Requirements

### Requirement: Ecommerce values represent net item revenue

Existing ecommerce events that emit `value` SHALL report the sum of their emitted item `price * quantity`, excluding shipping and tax, rounded to two decimal places. Ecommerce currency SHALL always be `USD`; all monetary fields SHALL use USD independently of the selected display currency. Purchase SHALL retain its transaction ID, coupon (empty when absent), items, and separate numeric shipping and tax fields.

#### Scenario: Purchase with a transaction discount
- **WHEN** a confirmed purchase contains two units priced at 100 each before a 20 merchandise discount, with shipping of 12 and tax of 8
- **THEN** the purchase reports `value: 180`, `shipping: 12`, and `tax: 8`
- **AND** its item reports `price: 90`, `discount: 10`, and `quantity: 2`
- **AND** transaction ID, currency, and the applied coupon are retained

#### Scenario: Checkout and cart event values
- **WHEN** an existing `begin_checkout`, `add_shipping_info`, `add_payment_info`, or `view_cart` event is emitted
- **THEN** its value equals the net revenue of its emitted items
- **AND** existing checkout metadata remains available

#### Scenario: Applied coupon in cart views
- **WHEN** a `view_cart` event is emitted for a cart with an applied coupon
- **THEN** `ecommerce.coupon` contains the applied code from the event's cart totals
- **AND** a later cart view after coupon removal does not retain the old code

#### Scenario: Selected currency differs from USD
- **WHEN** a shopper selects a display currency other than USD
- **THEN** ecommerce currency remains `USD`
- **AND** item prices, discounts, value, shipping, and tax use existing USD amounts without applying the display exchange rate
- **AND** synchronized item prices use their existing custom USD totals and purchase shipping/tax use their USD base amounts

### Requirement: Item prices and discounts are unit monetary values

Existing product and cart item payloads SHALL emit numeric discounted unit `price` and numeric unit `discount`, with zero discount when none applies. Purchase and checkout items SHALL include backend-applied merchandise discounts exactly once, including transaction-level discounts allocated to items. Emitted amounts SHALL be finite, and item revenue SHALL reconcile at the reported currency's monetary precision.

#### Scenario: Backend price already includes a coupon
- **WHEN** a backend item price already includes a transaction coupon discount
- **THEN** the payload uses that net price without subtracting the coupon a second time
- **AND** the monetary unit discount includes the applicable reduction

#### Scenario: Reuse custom totals across product types
- **WHEN** a simple or bundle cart/order item has `budsies_quote_item_totals`
- **THEN** the existing unlocalized price helper supplies its regular and paid amounts from those custom totals
- **AND** standard row totals do not override its custom final price
- **AND** the mapper emits unit price and numeric unit discount without another coupon subtraction or tax conversion

#### Scenario: Quantity and rounding
- **WHEN** a discounted line has multiple units and its total discount does not divide evenly into currency minor units
- **THEN** unit amounts retain sufficient precision for the reported line revenue to reconcile after currency rounding
- **AND** `discount` is a number rather than a percentage or an object

#### Scenario: Product without a discount
- **WHEN** an undiscounted product is included in an existing product event
- **THEN** its tax-exclusive unit price is emitted with `discount: 0`
- **AND** an event value, if present, matches its item revenue

#### Scenario: Taxed catalog products and unit-price resolution
- **WHEN** catalog product prices include nonzero tax, with or without a special price or campaign override
- **THEN** item price and discount are tax-exclusive unit amounts with tax removed exactly once
- **AND** raw `regular_price`, cached display getter amounts, and product quantity do not change their monetary basis
- **AND** default bundle-option pricing, gift-card amounts, and zero-valued campaign overrides remain supported
- **AND** multiplying the unit price by quantity produces the event revenue

### Requirement: Categories use available hierarchy levels

Item payloads SHALL populate `item_category` through `item_category5` from available category ancestry, ordered from broadest to most specific and limited to five levels. They SHALL NOT join category names into one hierarchy field or invent ancestry between unrelated categories.

#### Scenario: Known category ancestry
- **WHEN** product data identifies a parent category and a descendant category
- **THEN** their names populate `item_category` and `item_category2` in ancestry order

#### Scenario: Missing or ambiguous ancestry
- **WHEN** categories are absent or their ancestry cannot be established
- **THEN** the payload omits unknown levels
- **AND** at most one known category is used when no hierarchy can be established

### Requirement: Existing event and integration behavior is preserved

Payload updates SHALL preserve existing event names and firing points except for the cart-view readiness correction below, SKU/internal ID/composed variant reporting, and integration-specific custom fields. Each intended event emission SHALL continue to clear stale `ecommerce` data immediately before its payload push without introducing additional event pushes. GTM loading through the configured script source SHALL remain supported.

#### Scenario: Checkout funnel and purchase verification
- **WHEN** the existing checkout actions complete and an order is placed
- **THEN** `begin_checkout`, `add_shipping_info`, `add_payment_info`, and `purchase` retain their intended event counts
- **AND** each event follows an `ecommerce: null` push
- **AND** item identifiers and variants remain unchanged

#### Scenario: Consumer migration and Analytics receipt
- **WHEN** the payload correction is prepared for rollout
- **THEN** Redmine notes document before/after value, discount, and category shapes and the actual GTM container change status
- **AND** GA4 DebugView verifies purchase value, shipping, tax, coupon, currency, and items

### Requirement: Cart views wait for synchronized totals

An online, nonempty cart SHALL report `view_cart` only after the page mounts, local cart data loads, successful server totals have been applied during the application session, totals no longer require synchronization, and cart, totals, and coupon processing are idle. Each mounted cart-page visit SHALL emit at most one view using its current items and totals. Visual loading behavior SHALL remain independent of analytics readiness.

#### Scenario: Full reload with an applied coupon
- **WHEN** cached cart items load while server totals are still pending
- **THEN** no cart view is emitted yet
- **AND** after successful totals application and synchronization completion, one cart view contains the applied coupon and synchronized item revenue

#### Scenario: Navigation and subsequent synchronization
- **WHEN** a cart page mounts with already synchronized totals
- **THEN** it emits one cart view
- **AND** further synchronization or coupon changes during that visit do not emit another view
- **AND** a new cart-page visit can emit its own view

#### Scenario: Leaving before totals are ready
- **WHEN** the cart page is destroyed before synchronization completes
- **THEN** later totals completion does not emit a view for the previous visit

#### Scenario: Empty, offline, or failed synchronization
- **WHEN** the cart is empty or server totals synchronization is disabled or offline
- **THEN** a mounted, locally loaded cart reports its view when processing is idle without requiring a successful totals timestamp
- **AND** an online, nonempty cart without a successful totals response waits for a later successful synchronization
