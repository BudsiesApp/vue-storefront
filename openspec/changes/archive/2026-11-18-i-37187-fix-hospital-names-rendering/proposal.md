# Proposal

## Why

The `/sponsors/` hospital option appears literally as `Children&#039;s Hospital of Atlanta` in cart and checkout. Decoding character references at the existing option-display boundary fixes the reproduced defect while preserving source data.

## What Changes

- In `src/themes/petsies-capybara/helpers/get-cart-item-options.function.ts`, return `htmlDecode(option.value)` for every option from either `cartItem.totals.options` or `cartItem.options`, using `@vue-storefront/core/filters/html-decode`.
- Preserve labels, `isCustom`, the metadata guard and source precedence; components, templates and `truncate()` remain unchanged.
- Cover apostrophes, ampersands, inert markup-like text, source non-mutation, the empty metadata result and both fallback displays with maintained Jest specs.

## Capabilities

### New Capabilities

- `cart-item-option-presentation`: Decode option values for text-only cart and checkout fallback displays without mutating source data.

### Modified Capabilities

None.

## Impact

- Theme repository `vsf-capybara`: the existing option helper, `helpers/get-cart-item-options.function.spec.ts`, and `pages/DetailedCart/cart-item-configuration-extended.spec.ts`.
- App repository: `src/modules/customization-system/test/unit/components/cart-item-configuration.spec.ts`.
- The existing decoder is pure, DOM-free and SSR-safe; no dependency, configuration, Magento or API change is required.
- Raw data, add-to-cart/order payloads, `option_value`/`print_value`, fulfillment, the hospital dictionary and voucher delivery remain untouched, as do `/pals-kit/` customization-group display, shipment HTML and Storyblok code.
