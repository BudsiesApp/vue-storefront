# Spec Delta

## ADDED Requirements

### Requirement: Status-specific image-only artwork completion

For an order item whose loaded draft status is Awaiting artwork, the direct customization page SHALL work with only image upload customizations and their draft state entries and SHALL send only image upload entries when saving. This restriction SHALL apply to `/forevers/customize/`, `/golf-head-covers/customize/` and `/printed-product/customize/` with `orderItemId` and to their creation-wizard and images-gallery layouts. Group definitions SHALL remain unchanged for layout structure and SHALL NOT introduce non-image controls or saved entries. Availability rules on the retained image customizations SHALL NOT apply for Awaiting artwork; the source product and draft SHALL remain unchanged.

Non-image entries restored locally SHALL be discarded before saving and SHALL be absent from the state passed to saving. Complete retained image values SHALL be preserved, without restricting the page to the first image customization.

For Awaiting artwork, the wizard Photo step SHALL display translated `Upload Photos of Your Pet`, and the forevers and golf-head-covers page h1 SHALL display translated `Upload Photos for Your Forevers Plush` and `Upload Photos for Your Golf Head Covers` respectively. Printed-product SHALL continue to have no h1; regular creation and Awaiting-customization step headings SHALL remain `Customize your {productType}`, and other statuses SHALL keep their current page headings.

An Awaiting-artwork wizard SHALL open on Photo with its restored photo state even when local state contains a saved later step position; that saved position SHALL be ignored. Other statuses SHALL retain their existing saved-position restoration.

The storefront SHALL preserve existing customization inputs, availability rules and completion behavior for other statuses or no draft, the separate Upgrades alteration step, and inline upload's eligibility and single-customization selection rules.

#### Scenario: Awaiting artwork shows only image upload customizations on the page

- **WHEN** a customer opens an Awaiting-artwork item's direct customization page in a layout used by the three routes, with non-image customizations and one or several image upload customizations
- **THEN** only image upload fields are offered, covering grouped and ungrouped fields under the layout's existing rendering rules
- **AND** no non-image field is offered in either wizard list or the gallery, and empty groups introduce no steps
- **AND** the separate Upgrades step retains its existing behavior

#### Scenario: Awaiting artwork saves only image upload entries

- **WHEN** a customer confirms an Awaiting-artwork item's customization after loading a draft or restoring local state containing image and non-image entries
- **THEN** non-image draft and restored entries are absent from the state passed to saving
- **AND** saving sends only image entries with their complete current values, without a first-image-only restriction
- **AND** no group or unrelated entry is sent, and submission follows the existing successful-save sequence

#### Scenario: Awaiting customization remains unchanged

- **WHEN** a customer opens and completes an Awaiting-customization item
- **THEN** its existing customization inputs, initial state, fields, availability rules and completion behavior remain unchanged
- **AND** non-image entries remain permitted in its state-save payload subject to existing filtering

#### Scenario: Inline upload for Awaiting artwork shows only an image upload customization

- **WHEN** Order History offers inline photo upload for an Awaiting-artwork item whose product contains non-image customizations and several eligible image upload customizations
- **THEN** the inline form offers only the first eligible image upload customization
- **AND** saving sends only that customization's complete current image value, omitting non-image entries and the other image customizations

#### Scenario: Awaiting artwork retains its photo field and wizard step when draft state gates the image upload

- **WHEN** an Awaiting-artwork draft opened in the wizard or gallery stores Yes for `Send Later Upload Method` and a saved photo for required `Customer Image`, whose product availability rule requires the checkbox's No value
- **THEN** the form works with the image customization without that availability rule and with only its image draft entry, retaining the upload field and complete draft photo
- **AND** the wizard renders Photo with the uploader and photo, lists Photo then Upgrades, and Confirm visibly activates Upgrades without render errors
- **AND** the state passed to saving at Confirm contains only the photo entry and the source product and draft remain unchanged

#### Scenario: Awaiting artwork discards restored non-image entries and retains its photo

- **WHEN** an Awaiting-artwork form restores a saved photo alongside non-image entries including `Send Later Upload Method` set to Yes and `Name`, and the product's image rule requires the checkbox's No value
- **THEN** the image upload remains available and retains its complete restored photo value
- **AND** the restored non-image entries are discarded, leaving only the photo entry in the state passed to saving
- **AND** saving sends only the retained image entry

#### Scenario: Awaiting-artwork headings and unchanged Awaiting-customization headings

- **WHEN** the wizard Photo step displays an Awaiting-artwork item
- **THEN** its heading is translated `Upload Photos of Your Pet`
- **AND** the page h1 is translated `Upload Photos for Your Forevers Plush` for forevers or `Upload Photos for Your Golf Head Covers` for golf head covers
- **AND** Awaiting customization still displays `Customize your {productType}` when no last-step title override is supplied
- **AND** Awaiting customization keeps `Customize Your Forevers Plush` / `Customize Your Golf Head Covers` as its corresponding page h1

#### Scenario: Awaiting artwork opens on Photo despite a saved later wizard position

- **WHEN** an Awaiting-artwork wizard restores local photo state with a saved step position pointing past Photo
- **THEN** Photo remains active and displays the restored photo
- **AND** the saved later position does not open Upgrades
