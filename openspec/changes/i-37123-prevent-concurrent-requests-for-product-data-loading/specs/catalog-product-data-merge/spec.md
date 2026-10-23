# Spec Delta

## Purpose

Keep the product-by-SKU dictionary as complete as all loads of each product combined, so that a later, less detailed load does not remove data that pages and price calculations depend on.

## ADDED Requirements

### Requirement: Catalog loads merge into the existing entry without removing data
When a catalog load (a product list search, a single-product lookup, or the prefetch of bundle option products) writes a product for a SKU that already has an entry, the storefront SHALL deep-merge the loaded product into the existing entry. Fields, nested fields, and array items that the loaded product lacks SHALL be kept. Fields that the loaded product contains SHALL take the loaded value. When the SKU has no entry, the loaded product SHALL be stored as is.

#### Scenario: Category page after the product page
- **WHEN** a product fully loaded by the product page is loaded again by the Category page product list
- **THEN** the dictionary entry still contains `customizations`, `bundle_options`, `product_links`, `media_gallery`, `stock.max_sale_qty`, and `configurable_children[].media_gallery`

#### Scenario: Product page after the Category page
- **WHEN** a product loaded by the Category page product list is loaded again in full
- **THEN** the dictionary entry contains the fields the list projection excluded, including nested fields such as `stock.max_sale_qty`

#### Scenario: Load without bundle prefetch after a prefetching load
- **WHEN** a bundle product loaded with bundle prefetching is loaded again without prefetching
- **THEN** each bundle option link in the entry still has its product

#### Scenario: Bundle option products prefetched after a Category load
- **WHEN** products listed by a Category page are prefetched again as bundle option products, for example the photo pillow designs on the pillow creation page
- **THEN** their dictionary entries keep the fields only the Category load returned, such as `sgn`
- **AND** gain the fields the prefetch returned

#### Scenario: Newer values are applied
- **WHEN** a later catalog load contains a field with a different value than the existing entry
- **THEN** the entry holds the later value

#### Scenario: Catalog load of a new product
- **WHEN** a catalog load returns a product that is not in the dictionary
- **THEN** the loaded product is stored for its SKU

### Requirement: Explicit product writes replace the entry
A product written to the dictionary directly, outside a catalog load, SHALL replace the existing entry. This keeps intentional changes that remove data, such as Production Time options filtered by rush availability.

#### Scenario: Filtered Production Time options
- **WHEN** the multi-product page writes a product whose Production Time customization has fewer option values than the existing entry
- **THEN** the entry holds only the written option values

### Requirement: Linked product prefetches load every linked product
When the storefront prefetches the products linked to a bundle's options or a grouped product, it SHALL request all of them, however many there are.

#### Scenario: Bundle with more than 50 linked products
- **WHEN** a bundle product whose options link more than 50 products is loaded with bundle prefetching
- **THEN** every bundle option link has its product attached

#### Scenario: Grouped product with many associated products
- **WHEN** a grouped product with more than 50 associated simple products is loaded with prefetching
- **THEN** every associated product is loaded

### Requirement: Merged entries remain reactive
Every dictionary write SHALL store a new entry object so that components reading the entry update. Fields added by a merge MUST be reactive, and the previous entry MUST NOT be changed.

#### Scenario: Component reads a merged entry
- **WHEN** a component renders data from a dictionary entry and a later catalog load adds data to that entry
- **THEN** the component re-renders with the added data
