# Tasks

## 1. Wizard navigation

- [x] 1.1 Add `src/themes/petsies-capybara/helpers/use-creation-wizard-customize-later-link.ts` per design decisions 1–2, with colocated `use-creation-wizard-customize-later-link.spec.ts`; verify Forevers/new-item eligibility, exclusions for missing product/cart edits/customization mode/golf covers, all three product mappings, and that the link follows the current product type.
- [x] 1.2 Wire the composable and real links into `creation-wizard-form.vue`, rendering the floating link directly inside the last step's `sf-step` immediately after `<creation-wizard-form-last-step>`, with `position: sticky; bottom: var(--spacer-sm)`, and add scoped responsive action styles per decision 3; verify no link on Type, one link on each customization step, no changes to `creation-wizard-form-last-step.vue`, and that the wizard script adds only import/setup/return wiring.
- [x] 1.3 Render the label through `$t("Skip & Customize Later")` in both templates and manually add `"Skip & Customize Later","Skip & Customize Later"` to `src/themes/petsies-capybara/resource/i18n/en-US.csv` in alphabetical position; verify the CSV diff is exactly one added line; do not run `yarn update-i18n-files`.

## 2. Destination initialization

- [x] 2.1 Extend only the `forevers-customize-later` route props in `src/themes/petsies-capybara/router/index.js` and the corresponding page prop in `pages/ForeversCustomizeLater.vue` per decisions 4–5; pass `route.query.product` as on `forevers-create`, compute `initialSku` with `getForeversSkuByType` only for members of `PlushieProductType` (otherwise `undefined`), and pass it to `useMultiProductsPage`.

## 3. Integrated acceptance

- [x] 3.1 On the local storefront, verify the placement scenarios at mobile (375 px) and desktop (1280 px) widths: right-aligned link-before-Continue row on desktop, centered Continue-above-link column on mobile, square secondary appearance, and the last-step bottom-center floating link with a soft shadow that stops at the end of the step.
- [x] 3.2 Verify navigation from Photo with an incomplete photo field succeeds with only `product`, the cart is unchanged, and the Type/golf-covers exclusions hold.
- [x] 3.3 Load `/forevers/customize-later/?product=other` directly and verify Other is selected without a hydration mismatch; verify an unknown `product` keeps Dog.

## 4. Validation

- [x] 4.1 Run inside the Docker app container and resolve change-related failures:

```sh
docker compose exec -T app sh -c 'cd /var/www && npx vue-tsc --noEmit -p tsconfig.vue-tsc.json'
docker compose exec -T app sh -c 'cd /var/www && npx eslint src/themes/petsies-capybara/helpers/use-creation-wizard-customize-later-link.ts src/themes/petsies-capybara/helpers/use-creation-wizard-customize-later-link.spec.ts src/themes/petsies-capybara/components/customization-system/forms/creation-wizard-form.vue src/themes/petsies-capybara/pages/ForeversCustomizeLater.vue src/themes/petsies-capybara/router/index.js'
docker compose exec -T app sh -c 'cd /var/www && npx jest -c test/unit/jest.conf.js src/themes/petsies-capybara/helpers/use-creation-wizard-customize-later-link.spec.ts'
```
