# Spec Delta

## Purpose

Define how storefront cart item prices follow server-calculated item totals and campaign prices, so displayed prices and analytics use the amounts actually charged.

## ADDED Requirements

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
