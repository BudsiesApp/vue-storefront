# Spec Delta

## Purpose

Ensure creation pages and rich-text price directives can load parent products and present prices without fetching each bundle child product.

## ADDED Requirements

### Requirement: Creation pages load parent products without bundle child prefetching
The storefront SHALL load products used by creation forms without issuing an associated catalog request for their bundle child products. This behavior SHALL apply to initial single-product loads, multi-product creation pages, and product changes performed inside a creation flow.

#### Scenario: Single-product creation page opens
- **WHEN** a shopper opens a creation page backed by one bundle parent product
- **THEN** the storefront loads the parent product without requesting the products referenced by its bundle options

#### Scenario: Multi-product creation page opens
- **WHEN** a creation page loads multiple selectable bundle parent products
- **THEN** the storefront loads those parent products without requesting their bundle child products

#### Scenario: Creation flow changes its parent product
- **WHEN** a shopper selects a different parent product from within a creation flow
- **THEN** the storefront loads the selected parent product without requesting its bundle child products

#### Scenario: Non-creation product loading retains its default
- **WHEN** a product-loading consumer does not opt out of associated-product prefetching
- **THEN** the storefront retains the existing associated-product prefetch behavior for that consumer

#### Scenario: Creation-page parent is read from cache
- **WHEN** a creation-page loader reads a cached parent product or falls back to a catalog request
- **THEN** parent configuration retains the loader's disabled child-prefetch preference

### Requirement: Rich-text directives load prices without bundle child prefetching
The storefront SHALL disable associated-product prefetching when loading parent products referenced by rich-text price directives in both SSR and browser rendering. It SHALL continue to reuse parent products already present in the product dictionary and render prices through the existing product-price getters.

#### Scenario: Directive refers to an unloaded bundle parent
- **WHEN** a price directive loads a bundle parent absent from the product dictionary
- **THEN** it loads that parent with child-product prefetching disabled

#### Scenario: Directive refers to an already-loaded parent
- **WHEN** a price directive refers to a parent already present in the product dictionary
- **THEN** it reuses that parent without requesting its bundle children

### Requirement: Cart loading preserves child-stock quantity selection
The storefront SHALL retain child-product prefetching during the existing browser cart product refresh and server-item restoration paths. It SHALL copy refreshed bundle links onto cart items and preserve the quantity-selector helper's existing use of the selected or default child's stock.

#### Scenario: Successful cart merge refreshes products
- **WHEN** a successful cart merge refreshes a bundle cart item's product data
- **THEN** the cart uses browser product loading with child prefetch enabled and copies the resulting bundle links onto the item
- **AND** quantity-selector visibility can read the selected or default child's `stock.max_sale_qty` for the bundle option titled `product`

#### Scenario: Server cart item needs product data
- **WHEN** a bundle item is restored from the server through `product/single`
- **THEN** child prefetch remains enabled for both cached and fetched parent products

#### Scenario: Child stock is unavailable before cart refresh completes
- **WHEN** a cart item renders without its relevant loaded child or a nonzero maximum sale quantity
- **THEN** the existing quantity helper returns `10000`
- **AND** the cart component does not issue a child request solely to render its quantity selector

### Requirement: Customization option prices use embedded and campaign data
The storefront SHALL derive each customization choice's regular and special price from the pricing fields embedded in that customization option value and SHALL apply a matching promotional campaign price using the option value's product ID, without requiring a corresponding bundle child product in catalog state.

#### Scenario: Option value has only a regular price
- **WHEN** a customization option value provides a regular price and no applicable special price
- **THEN** the storefront uses the option value's regular price and treats the choice as having no discount

#### Scenario: Option value has an active special price
- **WHEN** a customization option value provides a special price below its regular price whose validity window includes the current time
- **THEN** the storefront uses the option value's regular price for comparison and its special price as the discounted price

#### Scenario: Special price does not reduce the regular price
- **WHEN** the resolved effective amount is equal to or greater than the regular amount
- **THEN** the option resolver returns the regular amount and no special price

#### Scenario: Special price starts in the future
- **WHEN** a customization option value's special-price start date is later than the current time
- **THEN** the storefront ignores the special price and uses the regular price

#### Scenario: Special price has expired
- **WHEN** a customization option value's special-price end date is earlier than the current time
- **THEN** the storefront ignores the special price and uses the regular price

#### Scenario: Promotional campaign discounts an option product
- **WHEN** the campaign discount dictionary contains a discounted final price for a customization option value's product ID
- **THEN** the storefront uses the campaign final price and its supplied regular reference price in preference to the embedded special price

#### Scenario: Promotional campaign has no matching option product
- **WHEN** a customization option value has no product ID or the campaign discount dictionary has no matching entry
- **THEN** the storefront uses the option value's embedded regular and applicable special price

### Requirement: Resolved option pricing drives all customization price calculations
The storefront SHALL use campaign-aware option-value pricing consistently when choosing defaults, identifying lowest prices, displaying price differences, calculating the customization total, and showing selected prices in cart configuration descriptions. It SHALL preserve zero-valued prices and convert embedded and campaign amounts into the active display currency exactly once.

#### Scenario: Options have different effective prices
- **WHEN** a customization widget compares option values with different effective prices
- **THEN** its default or lowest-price choice and displayed price differences are calculated from the resolved campaign-aware prices

#### Scenario: Shopper changes a customization selection
- **WHEN** a shopper selects a different priced option value
- **THEN** the customization total updates from that option value's resolved campaign-aware price

#### Scenario: A campaign makes an option free
- **WHEN** a campaign sets one option's final price to zero and other options have higher prices
- **THEN** lowest-price selection retains the free option and the customization total honors the zero amount

#### Scenario: Campaign or display currency changes
- **WHEN** the active campaign is changed or cleared, or the display currency exchange rate changes
- **THEN** widget prices, price deltas, customization totals, and cart configuration descriptions update from the option metadata and current campaign
- **AND** display currency conversion occurs once, with cart configuration descriptions applying their selection and cart-item quantities

### Requirement: Bundle selections remain compatible with add to cart
The storefront SHALL continue to build bundle selections from customization option values' bundle item identifiers and selected quantities.

#### Scenario: Shopper submits a configured bundle product
- **WHEN** a shopper submits a creation form with customization option values selected
- **THEN** the add-to-cart payload contains the same bundle option identifiers, bundle item identifiers, and quantities that correspond to those selections

### Requirement: Bundle-parent prices remain available to product-price consumers
The storefront SHALL retain a bundle parent's ordinary catalog price and calculate discount overrides using each enabled required customization's explicit default value, falling back to the enabled priced value with the lowest effective price, including campaign adjustments. The default and cart discount helpers SHALL delegate to the existing shared discount helper, which SHALL skip values with null or missing regular prices and return totals only when an included priced value's product ID matches a campaign entry. These price calculations SHALL NOT require loaded child products or mutate parent price fields. Existing rich-text product-price directives SHALL continue rendering the parent's ordinary and localized product-price entries. Optional add-ons SHALL NOT contribute to the default discount calculation, and unloaded child IDs SHALL NOT be added to product-price dictionaries. The default catalog price reader and generic final price calculation SHALL remain unchanged.

#### Scenario: Required customization has an explicit default
- **WHEN** an enabled required customization has a value marked as default
- **THEN** the default discount helper uses that value even when another choice has a lower effective price

#### Scenario: Required customization has no explicit default
- **WHEN** an enabled required customization has no value marked as default
- **THEN** the default discount helper chooses the enabled value with a non-null price and the lowest effective amount, including campaign adjustments

#### Scenario: Included values have no campaign match
- **WHEN** none of the included priced values has a matching campaign entry
- **THEN** the shared discount helper returns no override and the existing ordinary price calculation remains in use

#### Scenario: Matching campaign yields equal regular and final totals
- **WHEN** an included priced value has a campaign entry and the summed regular and final prices are equal
- **THEN** the shared discount helper still returns those totals

#### Scenario: Rich-text renders a bundle loaded without children
- **WHEN** a rich-text product-price directive refers to a loaded bundle with required customization values and no child records
- **THEN** it displays the existing catalog price with an applicable discount override calculated from required customization values
- **AND** the parent price does not depend on loader recalculation or cached child prices

#### Scenario: Campaign or currency changes while a bundle price is displayed
- **WHEN** a campaign changes or clears, or the active display currency changes
- **THEN** the rendered parent price uses its catalog price and any current customization-derived campaign override through the existing final-price handling
- **AND** clearing the campaign restores ordinary catalog-price handling
- **AND** localized product-price getters apply display currency conversion once

#### Scenario: Cart selections have quantities
- **WHEN** selected customization state items or the cart item have quantities greater than one
- **THEN** the cart total applies both quantities exactly once

#### Scenario: Default option metadata is unavailable
- **WHEN** the product lacks applicable required customization values
- **THEN** it retains existing parent-price resolution

#### Scenario: Cart item has selected option values
- **WHEN** a configured bundle has selected customization values and no authoritative server quote totals
- **THEN** its client price uses the selected option values and their selection and item quantities
- **AND** server quote totals retain precedence when available
