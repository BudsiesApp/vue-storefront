# Spec Delta

## Purpose

Allow customers creating a new Forevers to move to the existing customize-later page while retaining their chosen product type.

## ADDED Requirements

### Requirement: Offer navigation only during new Forevers customization

The storefront SHALL show a link labelled “Skip & Customize Later”, through the translation system, on every customization step after a product type is chosen in the new-item Forevers wizard. It MUST NOT show the link on Type, while editing an existing cart item, in the golf-covers wizard, or in order-history customization mode.

#### Scenario: Link is available throughout customization
- **WHEN** a customer chooses Cat in the new-item Forevers wizard and visits Photo, Pet Info, and Customize
- **THEN** each of those steps shows “Skip & Customize Later”
- **AND** returning to Type shows no such link

#### Scenario: Shared wizard consumers remain excluded
- **WHEN** the wizard is used for an existing Forevers cart item, for golf covers, or to customize an order-history item
- **THEN** no step shows the link

### Requirement: Match the recorded responsive link placement

On non-last customization steps, the link and Continue SHALL form one right-aligned row on tablet and desktop with the link first, and a centered column on mobile with Continue above the link. On the last customization step, the link SHALL float at the bottom center of the form while that step scrolls and stop at the end of the step; all instances SHALL use the existing square-cornered secondary button appearance, with only the floating instance adding a soft shadow.

#### Scenario: Non-last step at tablet and desktop widths
- **WHEN** Photo or Pet Info is displayed at tablet or desktop width
- **THEN** the link appears immediately before Continue in a right-aligned row of step actions

#### Scenario: Non-last step at mobile width
- **WHEN** Photo or Pet Info is displayed at mobile width
- **THEN** Continue appears above the link in a centered column
- **AND** the link fits within the form width

#### Scenario: Last step scroll boundary
- **WHEN** the customer scrolls through Customize at mobile, tablet, or desktop width
- **THEN** the link remains centered at the visible bottom of the form while the step scrolls
- **AND** scrolling beyond the step does not keep the link pinned over subsequent content
- **AND** the floating link has the secondary button appearance with square corners and a soft shadow
- **AND** fields, Add to Cart, and the link remain usable without being covered by the floating control

### Requirement: Transfer only the current product type through navigation

Activating the link SHALL navigate to `/forevers/customize-later/` with exactly `product=dog|cat|other` derived from the current product. The link MUST NOT carry any other wizard value, MUST NOT require wizard validation, and MUST NOT add or update a cart item or introduce a tracking event.

#### Scenario: Product type is carried
- **WHEN** the current Forevers is Cat and the customer activates the link
- **THEN** the destination path is `/forevers/customize-later/` with exactly `product=cat`

#### Scenario: Navigation does not require a valid step
- **WHEN** a customer has chosen Dog and activates the link on Photo despite an incomplete required photo field
- **THEN** navigation succeeds with exactly `product=dog`
- **AND** the cart is unchanged

#### Scenario: Other form data and actions do not cross the handoff
- **WHEN** a customer has entered a photo, name, email, production time, quantity, and other options before activating the link
- **THEN** only the current product type is transferred
- **AND** no add-to-cart, cart-update, or new tracking event is triggered by the link

### Requirement: Initialize the existing customize-later page product type from the query

The destination SHALL initially select the bundle named by a valid `product` query. Missing, unknown, or non-string `product` values SHALL retain the existing default Dog behavior without throwing. Customization options keep their normal defaults.

#### Scenario: Supported product types initialize correctly
- **WHEN** the customer opens the destination with `product` set to `dog`, `cat`, or `other`
- **THEN** the corresponding product type is selected after initialization

#### Scenario: Direct entry without preselection preserves defaults
- **WHEN** the destination is opened without `product` or `id`
- **THEN** it selects Dog with its normal option defaults

#### Scenario: Invalid query values are ignored
- **WHEN** an unknown or non-string `product` value is supplied, for example `product=bird` or a repeated `product` parameter
- **THEN** the value is ignored without throwing and Dog remains selected

#### Scenario: Reload preserves URL initialization
- **WHEN** `/forevers/customize-later/?product=other` is loaded directly or refreshed
- **THEN** SSR and client hydration complete without a mismatch caused by preselection
- **AND** the initialized form selects Other
