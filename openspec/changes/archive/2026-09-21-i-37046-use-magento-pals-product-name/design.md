## Context

See `proposal.md` for motivation and `specs/catalog-product-name-presentation/spec.md` for the behavior contract.

The `/sponsors/` page already loads the `palsKit` product during SSR and client navigation, stores it as the current catalog product, and uses the same object for structured data, description, pricing, and cart submission. Only the page and purchase headings bypass that object by reading fixed i18n strings. The order form receives the loaded product and owns organization selection, quantity, and cart submission independently of the headings.

## Goals / Non-Goals

**Goals:**

- Make the two application-controlled headings derive from the same loaded catalog product used by the purchase form.
- Avoid displaying stale legacy wording before catalog data is available.
- Keep the change testable at the page-component boundary without modifying purchase-form responsibilities.

**Non-Goals:**

- Rename SKU constants, routes, component names, CSS selectors, Storyblok slugs, or internal identifiers containing `kit`.
- Rewrite Storyblok blocks or other independently managed marketing copy.
- Change product loading, organization extraction, cart submission, voucher fulfillment, reporting, or integrations.
- Add a new catalog request or state-management path.

## Decisions

### Use the existing current product as the sole heading data source

Both headings will read the name from the page's existing validated current product rather than introducing another lookup or prop. This keeps SSR, client navigation, metadata, structured data, pricing, and visible product naming on the same catalog entity.

Alternative considered: read the SKU dictionary entry directly in the template. Rejected because the page already centralizes identity validation in its current-product computed value and the dictionary entry is an implementation detail of loading.

Alternative considered: store the product name in Storyblok or configuration. Rejected because it would create another editable source that can drift from Magento.

### Render product-name headings only when the catalog product is available

The heading block will use the loaded product name only after the current product passes the page's SKU check. No hard-coded legacy fallback will be displayed during loading or product-load failure.

Alternative considered: retain `Budsies Pals Kit` as a loading fallback. Rejected because a fallback can expose precisely the stale name this change removes and would remain maintenance-sensitive.

### Compose the purchase heading with a neutral translated command prefix

The purchase heading will combine the existing localized `Purchase` command with the catalog product name, producing `Purchase Budsies Pals Vouchers` for the current Magento value. The product name itself remains catalog content and will not be used as an i18n lookup key.

Alternative considered: create a translation containing a positional product-name placeholder. Rejected for this narrow English storefront label because it adds translation-catalog coupling to dynamic catalog data without changing the required output. If locale-specific grammar later requires reordering or inflection, that should be introduced as a separate localization capability.

### Keep regression coverage focused on page presentation and existing data flow

Component coverage will mount the page with a representative current product and assert both headings follow its name, including a changed name. Existing form behavior will be protected by asserting the same product continues to be passed to the order-form component; detailed organization, quantity, and cart tests belong to the order-form boundary.

Alternative considered: add an end-to-end checkout scenario for a two-binding presentation change. Rejected as disproportionate; focused component tests provide a more direct failure signal while preserving the existing form contract.

## Risks / Trade-offs

- [The heading is absent while the product is unavailable] -> This matches the form's existing availability gate and prevents stale fallback content; the normal SSR path preloads the product before rendering.
- [A Magento product name could contain encoded entities] -> Follow the page's established catalog display conventions and verify the rendered heading with representative encoded input if the component requires explicit decoding.
- [Removing translation entries could affect an undiscovered consumer] -> Search the full repository for each exact key before removal and retain any key that still has another consumer.
- [Simple prefix composition may not support every future locale's word order] -> Keep the current scope aligned with the existing English storefront; introduce a parameterized localization requirement if multilingual grammar becomes necessary.

## Migration Plan

1. Deploy the storefront presentation and focused regression tests with no Magento data migration.
2. Verify `/sponsors/` displays the current Magento product name in both headings and the form still receives the `palsKit` product.
3. Roll back the storefront deployment if presentation or purchase-flow regression is observed; catalog data and orders require no rollback.