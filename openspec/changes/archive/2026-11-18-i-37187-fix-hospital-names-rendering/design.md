# Design

## Context

See [proposal.md](./proposal.md) for motivation and [the capability delta](./specs/cart-item-option-presentation/spec.md) for the contract. The `/sponsors/` product has a `Hospital name` custom option and no customization groups, so cart and checkout use the fallback displays, which currently print the encoded value as text.

## Goals / Non-Goals

**Goals:** Fix the reproduced character-reference defect with the existing display helper and preserve purchase data.

**Non-Goals:** Long values are not specially handled.

## Decisions

### Decode each returned option value once

In `src/themes/petsies-capybara/helpers/get-cart-item-options.function.ts`, import `htmlDecode` from `@vue-storefront/core/filters/html-decode` and return `htmlDecode(option.value)` for every option selected from either online `cartItem.totals.options` or `cartItem.options`. The existing decoder is pure, DOM-free and SSR-safe, and directly addresses the observed entities without adding another abstraction.

Keep labels, `isCustom`, the metadata guard and source precedence unchanged, and leave components, templates and `truncate()` unchanged. Both fallback displays continue rendering text, so decoded markup-like input remains inert; raw data, add-to-cart/order payloads, `option_value`/`print_value`, fulfillment, the hospital dictionary and voucher delivery are untouched.

The helper spec covers both sources using the same apostrophe, ampersand, markup-like text and non-mutation cases, plus the existing empty result without option metadata. Each fallback component spec receives helper-produced `productOptions` and uses an `SfProperty` stand-in that renders `name`/`value` as text to verify the hospital name and absence of injected elements; shared consumers need no duplicate specs.

## Risks / Trade-offs

- [A component test stand-in renders HTML instead of text] → Keep the `SfProperty` stand-in faithful to text rendering and assert no `img` element is created in either fallback display.
