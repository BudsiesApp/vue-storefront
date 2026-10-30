# Design

## Context

See `proposal.md` for motivation and `specs/forevers-customize-later-navigation/spec.md` for the behavior contract.

Relevant current implementation:

- `creation-wizard-form.vue` is already 761 lines and is shared by Forevers, golf covers, and order-history customization; its root-group steps contain Continue, and its separate last-step child owns Add to Cart.
- The wizard exposes the current product, `plushieType`, `existingCartItem`, and customization mode; these are sufficient inputs for the handoff.
- `/forevers/create/` already uses the `product` query parameter, while `/forevers/customize-later/` maps only `id`; `ForeversCustomizeLater.vue` calls `useMultiProductsPage(productSkus)` without its supported `initialSku` argument.

## Goals / Non-Goals

**Goals:** Add narrowly scoped navigation and destination initialization wiring, and keep the large wizard's script changes to import/setup/return wiring.

**Non-Goals:** Carry or preselect customization options, refactor the wizard, add persistence or API calls, or alter existing analytics and purchase actions.

## Decisions

1. **Source eligibility and URL construction — new `helpers/use-creation-wizard-customize-later-link.ts`.** This composable accepts the existing reactive inputs and exposes an optional named-route location for `forevers-customize-later`, only for `PlushieType.FOREVERS` with a current product, no `existingCartItem`, and mode other than `ProductCustomizationMode.CUSTOMIZE`; inline computed logic in the wizard is the simpler alternative rejected because the wizard is already oversized.

2. **Carry only the product type.** Derive `product` with the existing `getForeversTypeByBundleSku`; the destination keeps its normal option defaults.

3. **Render real navigation with existing presentation.** Wire a translated `router-link` styled `sf-button color-secondary` (the established pattern for button-looking links in the theme) into non-last actions and directly inside the last step's `sf-step`, immediately after `<creation-wizard-form-last-step>`, with `position: sticky; bottom: 0` and right alignment; this follows the approved placement without changing the child component, while viewport-fixed positioning would violate the step-end boundary.

4. **Destination route prop and initial product.** Extend only `forevers-customize-later`'s route props with `preselectedProductType: route.query.product`, matching `forevers-create`, and pass a computed `initialSku` to `useMultiProductsPage`; setting the product after loading is simpler to wire but first displays the default Dog and needlessly switches products.

5. **Guard only the product mapping.** Compute `initialSku` with `getForeversSkuByType` only when the incoming value is one of the `PlushieProductType` values, otherwise return `undefined` for the existing Dog default, because the mapper throws on unknown input typed into the URL.

6. **Use the neighbouring translation pattern.** Render `{{ $t("Skip & Customize Later") }}` at both link placements and manually insert exactly `"Skip & Customize Later","Skip & Customize Later"` in alphabetical position in `resource/i18n/en-US.csv`; template `$t` needs no added script service or extraction command that would rewrite the CSV.

## Risks / Trade-offs

- **Sticky geometry can fail within nested layout/overflow containers** → Verify the last step at mobile, tablet, and desktop widths, including the end boundary and access to Add to Cart; keep positioning CSS-based and local to the step.
- **SSR and hydration must agree** → Derive the initial bundle from the same URL prop on server and client, and manually refresh to check for a hydration mismatch.

## Migration Plan

No data migration or dependency change is required. Ship the theme routing, template, helper, and translation together; rollback consists of reverting that theme change.
