# Spec Delta

## Purpose

Define how storefront cart item prices follow server-calculated item totals and campaign prices, so displayed prices and analytics use the amounts actually charged.

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

### Requirement: Cart item prices are not capped at the base product price

A cart item's price SHALL treat the server final price as the amount paid. When the paid unit price before discounts exceeds the base product price, the regular price SHALL include that surcharge and the item SHALL NOT show a discount for it. Items without such a surcharge SHALL keep the base price as the regular price and the final price as the special price.

#### Scenario: Paid option without a discount
- **WHEN** the base unit price is 100 and a paid option raises the paid unit price to 125
- **THEN** the cart item price is 125 with no special price

#### Scenario: Paid option with a coupon
- **WHEN** the paid unit price is 125 and a coupon reduces the final unit price to 115
- **THEN** the regular unit price is 125 and the special unit price is 115

#### Scenario: Sale price or coupon without a surcharge
- **WHEN** an item has a sale price or coupon discount and no surcharge
- **THEN** the regular price is the base price and the special price is the final price

#### Scenario: Totals without savings data
- **WHEN** item-level totals omit the savings amount and the final price exceeds the regular price
- **THEN** the cart item price is the final price with no special price

### Requirement: Bundle campaign prices keep zero values and selection quantities

When a campaign price applies to any selected bundle child, the bundle campaign price SHALL treat a child's campaign or special price of zero as zero and SHALL multiply each child's price by its selection quantity. This SHALL apply to default bundle prices and to bundle cart items without item-level totals.

#### Scenario: Free child in a campaign
- **WHEN** a selected bundle child has a campaign final price of 0
- **THEN** the bundle's campaign final price includes 0 for that child
- **AND** the bundle's regular price includes the child's regular price

#### Scenario: Selection quantity greater than one
- **WHEN** a selected child with a campaign final price of 30 has a selection quantity of 2
- **THEN** the bundle's campaign final price includes 60 for that child

#### Scenario: Mixed bundle
- **WHEN** only some selected children have campaign prices
- **THEN** the other children contribute their own prices multiplied by their selection quantities

### Requirement: Displayed product prices keep a zero campaign price

A product's displayed price SHALL treat a campaign final price of zero as a valid special price, so a product or upgrade made free by a campaign is shown as free next to its regular price. Missing or non-numeric campaign prices SHALL keep the current price resolution.

#### Scenario: Free upgrade in a campaign
- **WHEN** an upgrade with a regular price of 15 has a campaign final price of 0
- **THEN** its displayed price has a regular price of 15 and a special price of 0

#### Scenario: Bundle with a free default child
- **WHEN** a bundle's only required default child has a campaign final price of 0
- **THEN** the bundle's displayed price has the child's regular price and a special price of 0
- **AND** an event value derived from the displayed price is 0

#### Scenario: Non-zero or missing campaign price
- **WHEN** a product has a non-zero campaign final price, or no campaign price
- **THEN** its displayed price is the same as before this change

