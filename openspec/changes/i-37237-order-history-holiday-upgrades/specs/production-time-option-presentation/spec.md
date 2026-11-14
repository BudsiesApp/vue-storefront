# Production Time Option Presentation Delta

## ADDED Requirements

### Requirement: Holiday alteration options follow the owning order destination

On order-history alteration forms, the storefront SHALL offer only Holiday Production Time choices applicable to the owning order's shipping destination, using Magento's domestic/international classification. Both the order-history list and single-item customize-upgrades entry point SHALL use that order, not browser location, a saved checkout country, or another order. The existing underlying option identity and price SHALL be preserved.

#### Scenario: International cutoff has passed while domestic Rush remains open

- **WHEN** a Holiday alteration bundle has domestic Rush available but no international Rush record after the international cutoff
- **THEN** an international order's alteration form does not offer Rush
- **AND** a domestic order's form still offers that Rush when other existing eligibility rules permit it

#### Scenario: Domestic cutoff has passed while international Rush remains open

- **WHEN** a Holiday alteration bundle has international Rush available but no domestic Rush record after the domestic cutoff
- **THEN** a domestic order's alteration form does not offer Rush
- **AND** an international order's form still offers that Rush when other existing eligibility rules permit it

#### Scenario: Orders share an alteration bundle

- **WHEN** domestic and international orders using the same alteration bundle appear together or are visited consecutively through list and single-item entry points
- **THEN** each form independently retains only its own destination's Holiday choices
- **AND** preparing one order's choices does not remove choices from the shared product or another order's form

#### Scenario: Browser location differs from the order destination

- **WHEN** browser location or saved checkout country differs from the viewed order's shipping destination
- **THEN** the alteration form uses the order's shipping destination without a destination toggle
- **AND** it does not overwrite saved checkout country or product-page location selection

#### Scenario: Location presentations share an underlying Rush option

- **WHEN** domestic and international Holiday records share a Rush SKU
- **THEN** the order's form uses only its destination's record and existing label
- **AND** selecting it keeps its original customization value, bundle selection and price

### Requirement: Empty alteration Production Time sections are absent

When Holiday and destination filtering plus existing alteration-option rules leave no selectable Production Time upgrade, the order-history alteration form SHALL omit the whole Production Time section, including its heading and empty controls. Other eligible upgrades SHALL remain visible and purchasable through the existing cart flow. No replacement message SHALL be displayed.

#### Scenario: Only synthetic Standard remains after Holiday cutoffs

- **WHEN** Holiday restrictions remove Rush for the order's destination and only the non-purchasable Standard bookkeeping option remains
- **THEN** the form shows no Production Time section or heading
- **AND** a different eligible upgrade can still be selected and added to the cart

#### Scenario: Existing alteration rules remove the remaining upgrades

- **WHEN** the order's remaining Production Time choices are all excluded by existing purchased-option or availability rules
- **THEN** the form omits that customization rather than rendering its heading without choices
- **AND** unrelated customization visibility and submission remain unchanged

#### Scenario: A selectable Production Time upgrade remains

- **WHEN** the order has at least one eligible, not-already-purchased Production Time upgrade after filtering
- **THEN** the Production Time section and that upgrade remain usable
- **AND** the empty-section fix does not hide other upgrades

### Requirement: Order-specific filtering preserves unaffected Production Time flows

The follow-up SHALL preserve regular-purchase location toggles and Holiday timeline behavior, non-Holiday alteration choices, and existing price/submission handling on Petsies, Budsies and Education. Alteration Holiday labels and displayed-but-not-enforced slot counts SHALL remain as before. Destination-specific availability SHALL NOT require enabling timeline presentation or adding server-side cutoff validation.

#### Scenario: Regular purchase uses its Holiday location toggle

- **WHEN** a customer changes a regular-purchase product page's Holiday destination toggle
- **THEN** existing ready-location filtering and selection reconciliation apply unchanged
- **AND** no viewed order's shipping destination restricts that page

#### Scenario: Alteration bundle has no active Holiday membership

- **WHEN** an alteration bundle is unassigned to a Holiday group or outside its active group window and receives ordinary Production Time data
- **THEN** its existing options, labels, slot behavior and submission are preserved for domestic and international orders

#### Scenario: Holiday Rush count is zero on an alteration form

- **WHEN** Rush otherwise applies to the order's destination and the alteration form receives a zero Holiday slot count
- **THEN** this follow-up does not introduce slot-count-based exclusion or disablement
- **AND** the form retains its existing count presentation

#### Scenario: The order's Holiday cutoff passes while the page stays open

- **WHEN** an alteration form remains open across a cutoff without a normal data refresh
- **THEN** this change adds no timer or server-side rejection mechanism
- **AND** the next normal load uses the currently exported destination-specific choices
