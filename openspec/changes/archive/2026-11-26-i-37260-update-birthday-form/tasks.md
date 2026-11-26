# Tasks

## 1. App helper and request contract

- [x] 1.1 Add `getDaysInMonth(month: number): number` at `src/modules/budsies/helpers/get-days-in-month.function.ts` with a fixed 12-month table and February = 29, exported from `src/modules/budsies/index.ts`; verify a new unit spec under `src/modules/budsies/test/unit/helpers/` covers every month 1–12 without adding unsupported-month handling or tests.
- [x] 1.2 Add required numeric `orderId` to the `shareBirthday` payload type without changing its TaskQueue request or result handling; extend `src/modules/budsies/test/unit/store/actions.spec.ts` to verify the POST route, complete serialized body including `orderId` and `email`, successful return value, and non-200 rejection.

## 2. Theme order attributes and reactive days

- [x] 2.1 Add required `orderId` and `email` props to `components/organisms/OOrderSuccess/m-share-birthday-form.vue`, remove its checkout email mapping, and dispatch both props with the existing birthday fields; verify a successful form test sends the prop email even when checkout email differs and displays the thank-you state.
- [x] 2.2 Bind the existing computed `orderId` and `email` from `components/organisms/o-order-success.vue` into the birthday form; verify by source inspection that the bindings use those computed values, not the order number or checkout email, and confirm the resulting request during the browser check without a parent-page mount test.
- [x] 2.3 Replace non-reactive `daysOptions` with a computed list using the app's public helper and the existing `DD` placeholder; represent both `undefined` and the `MM` placeholder's `''` in the month type and treat them as no month (31 days, no helper call) in both the computed list and watcher. Verify adjacent form tests cover initial no month, April, February, January, and returning to `MM` through its change event, keeping a valid selected day.
- [x] 2.4 Clear only an invalid selected day when `birthMonth` changes, keep valid days, and key the day `SfSelect` by its option count while leaving the validation provider mounted; verify a real vee-validate form interaction clears January 31 on choosing April, displays the required error, and blocks dispatch, while January 29 survives a change to February.
- [x] 2.5 Verify keyboard selection after the day range shrinks during the browser check.

## 3. Preserved interactions and integration checks

- [x] 3.1 Extend `components/organisms/OOrderSuccess/m-share-birthday-form.spec.ts` to verify rejection notification with entered values retained and controls re-enabled, and extend the successful submission case with Add another clearing editable fields but reusing the same order props on the next submission; verify these through the visible form controls without adding automated pending/duplicate-request tests.
- [x] 3.2 Run the focused helper/action/theme specs with `yarn test:unit --runInBand --runTestsByPath <changed-spec-paths>`, then `yarn test:unit:maintained --runInBand` and relevant ESLint checks; verify the changed behavior passes and distinguish any unrelated failures.
- [x] 3.3 Inspect the local non-production success-page form in a browser: verify day choices and keyboard selection after month changes and returning to `MM`, required feedback and blocked invalid submission, disabled controls while pending, successful thank-you/Add another behavior, and unchanged layout/labels at narrow and desktop widths; verify the request carries the order entity ID/email without recording personal data or credentials.
- [x] 3.4 Inspect app and theme diffs to verify only the intended error-style CSS changes, and existing labels, translations, the story form, other submodules, and other theme branches remain unchanged; validate with `openspec validate i-37260-update-birthday-form --strict`.
- [x] 3.5 Align select validation error output with the name and address fields; verify color, spacing, underline and layout on desktop and mobile.
- [x] 3.6 Arrange mobile fields in two rows and verify empty and invalid layouts on mobile, desktop and near the breakpoint.
