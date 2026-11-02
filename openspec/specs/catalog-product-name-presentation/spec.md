# catalog-product-name-presentation Specification

## Purpose

Ensure application-controlled product labels in catalog purchase flows stay synchronized with the authoritative product name configured in Magento.

## Requirements

### Requirement: Purchase-flow product labels use the catalog product name
The storefront SHALL display the loaded Magento catalog product name in every application-controlled product-name label within the Budsies Pals `/sponsors/` purchase flow.

#### Scenario: Current Magento name is displayed
- **WHEN** the Budsies Pals product loads with the Magento name `Budsies Pals Vouchers`
- **THEN** the page heading displays `Budsies Pals Vouchers`
- **AND** the purchase heading displays `Purchase Budsies Pals Vouchers`

#### Scenario: A future Magento name change is displayed
- **WHEN** the Budsies Pals product loads with a different valid Magento product name
- **THEN** every application-controlled product-name label in the purchase flow displays that new name without a storefront deployment or Storyblok content change

### Requirement: Purchase wording remains compatible with catalog names
The storefront MUST compose the purchase heading without a hard-coded singular article or legacy product-name suffix.

#### Scenario: Catalog name is plural
- **WHEN** the loaded Magento product name is plural
- **THEN** the purchase heading prefixes the exact product name with `Purchase `
- **AND** the heading does not insert `a`, `Kit`, or `Kits`

### Requirement: Existing purchase behavior and independently managed content are preserved
Changing application-controlled product-name labels SHALL NOT alter organization selection, quantity selection, cart addition, product identifiers, routes, or independently managed Storyblok marketing content.

#### Scenario: Customer purchases the renamed product
- **WHEN** a customer selects an organization and quantity and submits the Budsies Pals purchase form after the catalog product name changes
- **THEN** the existing product is added to the cart with the selected organization and quantity as before

#### Scenario: Storyblok marketing content contains legacy terminology
- **WHEN** independently managed Storyblok content contains Budsies Pals terminology
- **THEN** the storefront renders that content without rewriting it as part of product-name label presentation
