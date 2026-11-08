# catalog-product-data-merge Specification

## Purpose

Preserve omitted product detail across catalog loads while refreshing returned collections, so product choices and associated products remain correct after repeated and differently projected loads.

## Requirements

### Requirement: Catalog loads preserve omitted fields
Catalog list loads, single-product lookups and bundle-option product prefetches SHALL preserve fields and nested fields omitted from an existing product entry, including arrays omitted entirely. Provided scalar/null values SHALL update the entry. A product with no existing entry SHALL be stored as returned. Returned arrays follow the membership and correspondence requirements below. Source: D1, D4.

#### Scenario: Category page after the product page
- **WHEN** a product fully loaded by the product page is loaded again by the Category page product list
- **THEN** fields omitted by that list projection, including whole omitted `customizations`, `bundle_options`, `product_links`, `media_gallery` arrays and omitted stock detail, remain in the entry
- **AND** returned corresponding configurable children retain their omitted gallery and stock detail

#### Scenario: Product page after the Category page
- **WHEN** a product loaded by the Category page product list is loaded again in full
- **THEN** the dictionary entry contains the fields the list projection excluded, including nested fields such as `stock.max_sale_qty`

#### Scenario: Load without bundle prefetch after a prefetching load
- **WHEN** a bundle product loaded with bundle prefetching is loaded again without prefetching
- **THEN** each surviving corresponding bundle option link in the entry still has its own prefetched product

#### Scenario: Bundle option products prefetched after a Category load
- **WHEN** products listed by a Category page are prefetched again as bundle option products, for example the photo pillow designs on the pillow creation page
- **THEN** their dictionary entries keep any fields returned only by the Category load, such as `sgn` when that load supplied it
- **AND** gain the fields the prefetch returned

#### Scenario: Newer values are applied
- **WHEN** a later catalog load contains a field with a different value than the existing entry
- **THEN** the entry holds the later value

#### Scenario: Catalog load of a new product
- **WHEN** a catalog load returns a product that is not in the dictionary
- **THEN** the loaded product is stored for its SKU

### Requirement: Returned arrays replace membership
Every array returned by a catalog load SHALL determine that array's membership and order in the entry. Members absent from the returned array SHALL be removed, and an empty returned array SHALL clear it. An array omitted entirely SHALL remain unchanged. This applies recursively to all product arrays, including scalar arrays. Source: D2, D4.

#### Scenario: Catalog load returns fewer choices
- **WHEN** a stored customization has Standard and Rush, and a catalog load returns only Standard for that customization's values
- **THEN** its stored values contain only Standard
- **AND** Rush is not retained as an extra member

#### Scenario: Catalog load clears an array
- **WHEN** a catalog load returns an empty array for an existing product collection
- **THEN** the entry holds an empty array for that collection

#### Scenario: Catalog load omits an array
- **WHEN** a catalog projection excludes an entire array previously stored for the product
- **THEN** that array and its existing members remain unchanged

#### Scenario: Raw catalog data follows the multi-product page write
- **WHEN** the multi-product page has explicitly stored transformed Production Time values containing synthetic Standard and filtered rush values, and a later catalog load returns the raw values without synthetic Standard
- **THEN** the dictionary holds exactly the returned raw value membership, with no retained synthetic Standard or duplicate value introduced by the merge
- **AND** subsequent page preparation can rebuild the normal Production Time choices from those values

#### Scenario: Scalar array is refreshed
- **WHEN** a catalog load returns a shorter `disabled_upgrades` array
- **THEN** the entry contains exactly the returned values in their returned order

### Requirement: Corresponding array items preserve their own detail
Returned customizations and their values, bundle options and their links, and configurable children SHALL retain omitted fields only from the same domain item in the existing entry. Reordering or removing items MUST NOT transfer another item's data or create duplicate members. Newly introduced items SHALL NOT inherit data from a different item at the same position. Source: D1, D2, D4.

#### Scenario: Reordered bundle links keep the correct prefetched products
- **WHEN** a non-prefetching catalog load returns existing bundle links in a different order
- **THEN** each surviving link keeps the prefetched product for its own SKU within its own option
- **AND** a removed link and its product are absent

#### Scenario: New link replaces a removed link at the same position
- **WHEN** a returned bundle option contains a new linked SKU at a position previously occupied by another SKU
- **THEN** the new link does not inherit the old link's product

#### Scenario: Projected configurable children change order and membership
- **WHEN** a list load returns a reordered subset of existing configurable children without their detailed gallery and stock fields
- **THEN** each surviving child keeps its own omitted detail
- **AND** children absent from the returned array are removed

#### Scenario: Customization option values change order
- **WHEN** a load returns a customization's values in a different order with fewer members
- **THEN** the stored values have the returned membership and order, without fields copied from a different value by position

### Requirement: Explicit product writes replace the entry
A product written to the dictionary directly, outside a catalog load, SHALL replace the existing entry. This keeps intentional changes that remove data, such as Production Time options filtered by rush availability. Source: D1.

#### Scenario: Filtered Production Time options
- **WHEN** the multi-product page writes a product whose Production Time customization has fewer option values than the existing entry
- **THEN** the entry holds only the written option values

### Requirement: Linked product prefetches load every linked product
When the storefront prefetches the products linked to a bundle's options or a grouped product, it SHALL request all of them, however many there are. Source: D1.

#### Scenario: Bundle with more than 50 linked products
- **WHEN** a bundle product whose options link more than 50 products is loaded with bundle prefetching
- **THEN** every bundle option link has its product attached

#### Scenario: Grouped product with many associated products
- **WHEN** a grouped product with more than 50 associated simple products is loaded with prefetching
- **THEN** every associated product is loaded

### Requirement: Merged entries remain reactive
Every update to an existing dictionary entry SHALL store a new entry object so that components reading the entry update. Fields added by a merge MUST be reactive, and the previous entry MUST NOT be changed. Source: D1.

#### Scenario: Component reads a merged entry
- **WHEN** a component renders data from a dictionary entry and a later catalog load adds data to that entry
- **THEN** the component re-renders with the added data
