# Spec Delta

## Purpose

Display decoded option text accurately and safely in cart and checkout fallback views while preserving source items and option values.

## ADDED Requirements

### Requirement: Option values display decoded characters from either source
The storefront SHALL decode character references exactly once in every returned display option value, whether selected from online totals options or client options.

#### Scenario: Apostrophe in a hospital name
- **WHEN** the selected option value from either source is `Children&#039;s Hospital of Atlanta`
- **THEN** its display text is `Children's Hospital of Atlanta`

#### Scenario: Ampersand in an option value
- **WHEN** the selected option value from either source is `A &amp; B`
- **THEN** its display text is `A & B`

### Requirement: Option input remains inert in text-only displays
The storefront MUST render decoded option values as text, never executable HTML.

#### Scenario: Markup-like hospital input
- **WHEN** an option value is `&lt;img src=x onerror=alert(1)&gt;`
- **THEN** its display text is the literal `<img src=x onerror=alert(1)>`
- **AND** neither fallback display creates an `img` element or executes the handler

### Requirement: Display conversion preserves source data and the metadata guard
Display conversion MUST NOT mutate the source item or its option values. An item without custom or configurable option metadata SHALL return an empty display-option list.

#### Scenario: Display conversion does not mutate the source item
- **WHEN** display options are derived from an item with an encoded option value from either source
- **THEN** the original item and its option values remain unchanged

#### Scenario: Item has no supported option metadata
- **WHEN** an item has neither custom options nor configurable options
- **THEN** its fallback display options remain an empty list

### Requirement: Cart and checkout share accurate fallback option presentation
Items with custom options and no customization groups SHALL display the exact decoded hospital name in the detailed cart and checkout Review table, preserving the option label and custom-option classification.

#### Scenario: Sponsor purchase reaches the affected fallback paths
- **WHEN** a customer adds the `/sponsors/` product with `Hospital name` set to `Children's Hospital of Atlanta` on one desktop viewport
- **THEN** `/checkout/cart/` displays that exact name in its expanded options
- **AND** the checkout Review table displays that same name
- **AND** the label remains `Hospital name`
