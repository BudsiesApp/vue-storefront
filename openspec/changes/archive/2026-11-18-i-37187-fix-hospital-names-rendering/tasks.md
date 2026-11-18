# Tasks

## 1. Option Value Decoding

- [x] 1.1 In `src/themes/petsies-capybara/helpers/get-cart-item-options.function.ts`, return `htmlDecode(option.value)` from `@vue-storefront/core/filters/html-decode` for every option from either source, preserving labels, `isCustom`, the metadata guard and source precedence. Update `helpers/get-cart-item-options.function.spec.ts` to cover both sources with apostrophe, ampersand, markup remaining literal text and source non-mutation cases, plus `[]` without custom/configurable metadata; verify with 3.1.

## 2. Fallback Component Coverage

- [x] 2.1 Update `src/modules/customization-system/test/unit/components/cart-item-configuration.spec.ts`, mounting the fallback without customization groups using helper-produced `productOptions` and an `SfProperty` text stand-in; assert visible `Children's Hospital of Atlanta` and no injected `img` for escaped unsafe input. Verify with 3.1 without duplicate shared-consumer specs.
- [x] 2.2 Update `src/themes/petsies-capybara/pages/DetailedCart/cart-item-configuration-extended.spec.ts`, mounting the fallback with helper-produced `productOptions` and an `SfProperty` stand-in rendering `name`/`value` as text; assert visible `Children's Hospital of Atlanta` and no injected `img` for escaped unsafe input. Verify with 3.1, leaving components, templates and `truncate()` unchanged.

## 3. Validation

Use the existing Docker `tests` service with the repository mounted at `/var/www`. `README.md` documents `docker compose exec tests ./run-tests.sh`, but that script installs/runs theme Playwright tests; invoke the package scripts directly in the same container for this unit/lint/type-check scope. These commands are implementation tasks, not commands to run during proposal creation. No `core/`-only tests are required.

- [x] 3.1 Run `docker compose exec -T -w /var/www tests yarn test:unit:maintained --runInBand --runTestsByPath src/themes/petsies-capybara/helpers/get-cart-item-options.function.spec.ts src/modules/customization-system/test/unit/components/cart-item-configuration.spec.ts src/themes/petsies-capybara/pages/DetailedCart/cart-item-configuration-extended.spec.ts`; all helper and fallback text-rendering cases must pass.
- [x] 3.2 Run `docker compose exec -T -w /var/www tests yarn lint` and `docker compose exec -T -w /var/www tests yarn type-check`; verify both pass for the combined app/theme checkout.
- [x] 3.3 Run `docker compose exec -T -w /var/www tests yarn test:unit:maintained`, the suite used by CI, and record the result; review the diff to verify raw option/order payloads, `option_value`/`print_value`, fulfillment, dictionary and voucher code, `/pals-kit/` customization groups, shipment `v-html`, Storyblok, dependencies and configuration have not changed.
- [x] 3.4 On one desktop viewport at the local `DEFAULT_STORE_DOMAIN`, open `/sponsors/`, select `Children's Hospital of Atlanta`, and add it through the form; verify that exact name in expanded `/checkout/cart/` options and the checkout Review table, recording the viewport and visible results without order/payment/voucher actions. Keep unsafe inputs in unit fixtures rather than changing the hospital dictionary.

## Operator handoff (not performed by the apply session)

The theme change belongs to `vsf-capybara` branch `37187-fix-hospital-names-rendering` and must be pushed with the app branch. Delivery, pushing, opening the companion PR and checking CI are operator actions; the apply session must not commit, push or open PRs.
