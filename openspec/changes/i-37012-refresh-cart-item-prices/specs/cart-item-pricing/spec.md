# Spec Delta

## Purpose

Defines how storefront cart-line prices follow the item-level totals calculated by the server, so cart lines agree with the cart totals that the customer is charged.

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
