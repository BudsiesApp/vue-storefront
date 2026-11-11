# Spec Delta

## Purpose

Defines how storefront cart-line and displayed product prices follow the item-level totals and campaign prices calculated by the server, so displayed prices agree with what the customer is charged.

## ADDED Requirements

### Requirement: Cart item totals refresh after recalculation

When server cart totals are recalculated, including after coupon application or removal, and a response item includes item-level totals, the storefront SHALL update the matching cart item's item-level totals while preserving its other item data. When a response item has no item-level totals, the cart item's existing totals SHALL remain unchanged.

#### Scenario: Coupon applied without a reload
- **WHEN** a coupon reduces a cart item's final unit price from 100 to 90
- **THEN** the cart item shows a final unit price of 90 without a page reload

#### Scenario: Coupon removed without a reload
- **WHEN** the coupon is removed
- **THEN** the cart item shows its undiscounted unit price without a page reload

#### Scenario: Other item data preserved
- **WHEN** item-level totals are refreshed
- **THEN** the item's customization, plushie, and purchase-flow data remain unchanged

#### Scenario: Response without item totals
- **WHEN** a recalculated totals response item has no item-level totals
- **THEN** the cart item keeps its previous item-level totals

#### Scenario: Response item without a matching cart item
- **WHEN** a recalculated totals response item does not correspond to any cart item
- **THEN** no cart item's item-level totals change

### Requirement: Cart item prices follow server price rule changes on the first load

When a cart price rule that affects a cart item is enabled or disabled on the server, the storefront SHALL show the cart item's recalculated price once the first cart totals recalculation of the page load completes, without requiring an additional page load. This SHALL also apply when the cart is loaded with the client state taking precedence, as on checkout entry. Until that recalculation completes, the storefront MAY show the previously stored item price.

#### Scenario: Rule enabled before a page load
- **WHEN** a cart price rule that discounts a cart item by 10% is enabled and the customer opens the cart page once
- **THEN** after the cart totals are recalculated, the cart item shows the discounted price
- **AND** the cart item's discount matches the discount in the cart totals

#### Scenario: Rule disabled before a page load
- **WHEN** a cart price rule that discounted a cart item is disabled and the customer opens the cart page once
- **THEN** after the cart totals are recalculated, the cart item shows its price without that discount

#### Scenario: Checkout entry with changed pricing
- **WHEN** the item pricing changed on the server and the customer enters checkout
- **THEN** after the cart totals are recalculated, the checkout shows the recalculated item prices

### Requirement: Displayed product prices keep a zero campaign price

A product's displayed price SHALL treat a campaign final price of zero as a valid special price, so a product, upgrade or bundle child made free by a campaign is shown as free next to its regular price. A non-zero campaign price SHALL be shown as the special price, also when the product has its own special price. A missing or non-numeric campaign price SHALL keep the catalog price resolution, including a catalog special price of zero.

#### Scenario: Free upgrade in a campaign
- **WHEN** an upgrade with a regular price of 15 and no special price has a campaign final price of 0
- **THEN** its displayed price has a regular price of 15 and a special price of 0

#### Scenario: Free product with its own special price
- **WHEN** a product with a regular price of 359 and a special price of 259 has a campaign final price of 0
- **THEN** its displayed price has a regular price of 359 and a special price of 0

#### Scenario: Non-zero campaign price on top of a special price
- **WHEN** a product with a regular price of 25 and a special price of 20 has a campaign final price of 15
- **THEN** its displayed price has a regular price of 25 and a special price of 15

#### Scenario: Zero catalog special price without a campaign
- **WHEN** a product with a regular price of 36 has a special price of 0 and no campaign price
- **THEN** its displayed price has a regular price of 36 and a special price of 0

#### Scenario: Missing or non-numeric campaign price
- **WHEN** a product has no campaign price, or a non-numeric one
- **THEN** its displayed price is resolved from its catalog prices

### Requirement: Bundle campaign prices keep zero values and selection quantities

When a campaign price applies to any selected bundle child, the bundle campaign price SHALL treat a child's campaign or special price of zero as zero and SHALL multiply each child's price by its selection quantity. A missing, zero, negative or non-numeric selection quantity SHALL count as 1. This SHALL apply to default bundle prices and to bundle cart items without item-level totals.

#### Scenario: Free default child in a campaign
- **WHEN** a bundle's default child has a regular price of 359, a special price of 259 and a campaign final price of 0
- **THEN** the bundle's displayed price has a regular price of 359 and a special price of 0

#### Scenario: Selection quantity greater than one
- **WHEN** a selected child with a campaign final price of 30 has a selection quantity of 2
- **THEN** the bundle's campaign final price includes 60 for that child

#### Scenario: Mixed bundle
- **WHEN** only some selected children have campaign prices
- **THEN** the other children contribute their own prices multiplied by their selection quantities

#### Scenario: Invalid selection quantity
- **WHEN** a selected child's quantity is missing, zero, negative or non-numeric
- **THEN** the child's price is counted once
