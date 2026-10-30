# Proposal

## Why

Customers partway through creating a Forevers need a way to continue on the existing customize-later page without choosing their product type again. The discarded direct-to-cart prototype is not part of this change.

## What Changes

- Add a translated “Skip & Customize Later” navigation link on every customization step of the Forevers wizard when adding a new item; exclude Type, cart edits, golf covers, and order-history customization.
- Place the link beside Continue on non-last steps with the recorded responsive ordering, and float it at the bottom-right within the last step's scroll boundary using the existing secondary button appearance.
- Navigate to `forevers-customize-later` with the current `product` only, carrying no other wizard data and performing no cart action.
- Initialize the destination's product type from the `product` query parameter.

## Capabilities

### New Capabilities

- `forevers-customize-later-navigation`: Wizard link eligibility, placement, URL handoff, and destination product type initialization.

### Modified Capabilities

None. The existing capability inventory has no Forevers wizard-to-customize-later handoff specification.

## Impact

- Theme wizard template wiring and scoped styles; focused logic in a new helper under `src/themes/petsies-capybara/helpers/` keeps the already large wizard from accumulating logic.
- Theme router and `ForeversCustomizeLater.vue`; reuse the existing Forevers SKU helpers and `useMultiProductsPage`'s `initialSku` argument.
- One template-translated label and one manually added line in the alphabetically sorted `src/themes/petsies-capybara/resource/i18n/en-US.csv`, plus one focused colocated helper unit spec.
- No API, dependency, Magento, cart/add-to-cart, GTM-event, or order-history flow changes.
