# Spec Delta

## ADDED Requirements

### Requirement: Status-specific image-only artwork completion

For an order item whose loaded draft status is Awaiting artwork, the direct customization page SHALL offer only image upload customization fields and SHALL send only image upload customization entries when saving the item's state. This restriction SHALL apply to `/forevers/customize/`, `/golf-head-covers/customize/` and `/printed-product/customize/` with `orderItemId`, to the layouts used by the three routes (creation wizard and images gallery), and to the Petsies, Budsies, Budsies Education, Bulk Orders and Waggables themes. Group headings used to organize image fields SHALL NOT introduce non-image customization controls or saved entries. Existing field availability rules SHALL continue to apply.

The storefront SHALL preserve the existing behavior for Awaiting-customization items and all other statuses, the separate Upgrades alteration step, and the inline upload's existing eligibility and single-customization selection rules.

#### Scenario: Awaiting artwork shows only image upload customizations on the page

- **WHEN** a customer opens an Awaiting-artwork item's direct customization page in a layout used by the three routes, with a product containing non-image customizations and one or several otherwise eligible image upload customizations
- **THEN** only image upload customization fields are offered, covering grouped and ungrouped fields under the layout's existing rendering rules
- **AND** no non-image customization field is offered, including in the wizard's normal and selected-locked lists
- **AND** the separate Upgrades step retains its existing behavior

#### Scenario: Awaiting artwork saves only image upload entries

- **WHEN** a customer saves an Awaiting-artwork item from the customization page and the form state includes image values and non-image entries loaded from the draft or restored locally
- **THEN** the state-save payload contains only entries whose customization IDs belong to image upload customizations of that product
- **AND** the complete current image values are preserved for every included entry, with no first-image-only restriction on the page
- **AND** no group entry or unrelated customization entry is sent, and submission follows the existing successful-save sequence

#### Scenario: Awaiting customization remains unchanged

- **WHEN** a customer opens and completes an Awaiting-customization item
- **THEN** the existing customization fields, initial values, availability rules, and completion behavior remain unchanged
- **AND** its state-save payload is not restricted to image customization entries

#### Scenario: Inline upload for Awaiting artwork shows only an image upload customization

- **WHEN** Order History offers inline photo upload for an Awaiting-artwork item whose product contains non-image customizations and several eligible image upload customizations
- **THEN** the inline form offers only the first eligible image upload customization
- **AND** saving sends only that customization's complete current image value, omitting non-image entries and the other image customizations
