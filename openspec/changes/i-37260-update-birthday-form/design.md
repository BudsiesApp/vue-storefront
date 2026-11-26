# Design

## Context

See [proposal.md](proposal.md) for the motivation and [the capability delta](specs/order-success-birthday-sharing/spec.md) for behavior.

- The app's `shareBirthday` action already JSON-serializes its payload, uses `TaskQueue`, posts to `${config.budsies.endpoint}/share/artists?token={{token}}`, and throws for `resultCode !== 200`.
- The theme's birthday form uses the Options API, vee-validate providers/observer, and Storefront UI selects. Its days are currently a non-reactive `created()` value; its email comes from checkout state.
- `o-order-success.vue` already exposes computed `orderId` from `confirmation.magentoOrderId` and `email` from `order.personalDetails.emailAddress`.
- This checkout does not contain `MMarketingSubscriptionForm` or its example spec from #37182. Neither is a dependency of this change. Existing `components/organisms/o-confirm-order.spec.ts` demonstrates the theme's Vue Test Utils/Vuex test conventions.
- Only the app and checked-out theme submodule need edits. The confirmed backend contract keeps the existing route and accepts `orderId` in the body; the VSF API forwards that body unchanged.

## Goals / Non-Goals

**Goals:** Keep calendar policy reusable in the app, keep order attributes owned by the success page, and preserve the existing form's lifecycle and validation with a small localized change.

**Non-Goals:** No new service, composable, shared state, date library, year field, frontend order verification, dependency patch, cross-branch port, or API adapter change. Preserve label bindings and desktop layout; update component CSS for select error alignment and a two-row mobile layout.

## Decisions

### 1. A pure calendar helper with a bounded input contract

Add `getDaysInMonth(month: number): number` in `src/modules/budsies/helpers/get-days-in-month.function.ts`, exported by `src/modules/budsies/index.ts`. A fixed 12-entry month-length table gives February 29 without year or timezone semantics. Its contract is months 1–12 only; do not add a fallback, throw, guard, or test for invalid month numbers. The component calls it only for its numeric 1–12 options. Both the initial `undefined` and the month placeholder's `''` mean no month; that behavior belongs in the form, not the helper.

This is cost rung 4: a small pure function and public export. Reusing the existing module/export layout is rung 2. A date dependency or leap-year calculation would cost more and model the wrong rule.

### 2. Keep the component's existing ownership and validation

Remove `daysOptions` from `NonReactiveData` and `created()`. Type `birthMonth` to include the selectable empty string as well as numeric months and `undefined`. Compute its list from `birthMonth` with `getOptionsList`: both `undefined` and the selectable `MM` placeholder's `''` use 31 without calling the helper; only a numeric selected month calls the helper. Retain the existing translated `DD` placeholder and leave month options non-reactive. Reuse this same no-month interpretation in the month watcher, so returning to `MM` expands the day list to 31 and keeps any selected day.

Watch `birthMonth`; when a selected day exceeds the new maximum, clear only `birthDay` to `undefined`. Retain a valid selection. Keep the existing day `ValidationProvider` mounted so it retains its interaction/validation state; its model-driven validation shows the existing required error on clearing. The existing observer's `passes()` remains the submission boundary and blocks an empty day. Do not duplicate calendar checks in the action or add a separate validity state machine. Test this through the actual validation path, not by calling `onSubmit` directly on invalid input.

Pass validation errors to the selects' built-in error output, matching the name field and address form for color and spacing.

On mobile, place the full-width name field above two equal-width selects with spacer gaps between rows and selects. Keep the existing desktop row unchanged.

**Select refresh:** The installed `SfSelect` caches option indexes in `mounted()`, but its `updated()` refreshes them only when the option list grows. Merely shrinking slot options can therefore leave keyboard navigation pointing at stale days. Give the day `SfSelect` a public Vue `key` derived from the number of day options so a changed range rebuilds the select and its cache. Keep the provider outside that key. This is a local use of Vue's supported lifecycle (rung 4), not a dependency patch or a call to private select methods. Unchanged ranges keep the same select instance.

The change is simple enough for the existing Options API component; extracting a composable would add indirection without reusable stateful logic.

### 3. Explicit order props, unchanged transport

Add required Number `orderId` and String `email` props to `m-share-birthday-form.vue`. Remove `mapState` and `customerEmail`. Bind `:order-id="orderId"` and `:email="email"` in `o-order-success.vue` using its existing computed values; neither the order number nor the marketing form is needed.

Extend the inline action payload type with `orderId: number`. The form dispatches `budsies/shareBirthday` with `{ name, birthMonth, birthDay, email, orderId }`; the action body and endpoint do not change. Keep the existing non-200 error behavior and form catch/finally behavior. `clearForm` resets only name/month/day, so Add another naturally reuses the order props.

This reuses the existing Component → Vuex action → TaskQueue transport (rung 2), adding only props, bindings, and one payload field (rung 4). A direct request, checkout-state fallback, or new order-proof abstraction would introduce unnecessary coupling. Server-side order verification remains Magento's responsibility.

### 4. Focus tests on public behavior

- Add a helper spec under `src/modules/budsies/test/unit/helpers/`, covering all 12 months and no unsupported inputs.
- Extend `src/modules/budsies/test/unit/store/actions.spec.ts` with a separate birthday group reusing its mocked `TaskQueue`: assert the existing POST route, parsed request body including the unchanged email and numeric order ID, returned successful result, and non-200 rejection.
- Add `components/organisms/OOrderSuccess/m-share-birthday-form.spec.ts` beside the component. Use Vue Test Utils and Vuex consistent with nearby organism tests; use real vee-validate for the cleared-day/blocked-submit assertion. Exercise select change events (Storefront UI's model is `selected`/`change`), not just component data assignments.
- Assert rendered day options for initial no month, April, February, January, and returning to the `MM` placeholder (`''`); invalid clearing and required feedback; valid-day retention; correct successful payload despite a different checkout email; and rejection notification. Extend the successful submission case with Add another and a second submission to verify the new order props survive clearing without separate setup.
- Keep the existing mocked Storefront UI style and shared Jest configuration unchanged. Inspect real keyboard behavior in the browser instead of mounting the dependency's import graph in Jest.
- Verify the two success-page prop bindings by source inspection and the browser request. Do not add a parent-page mount test or automated tests of the unchanged pending/duplicate-request guard.

Run focused Jest files through the app's configured test runner, then the maintained suite and relevant lint checks. Browser inspection uses the local non-production success-page flow to confirm visible options and keyboard selection (including returning to `MM`), required feedback, pending controls, existing labels/layout, and repeat entry; it is not a new automated end-to-end suite.

## Risks / Trade-offs

- [Frontend order attributes do not themselves authorize a request] → This change only transports the confirmed proof pair; Magento #37259 owns verification.
- [Theme code imports a new app export] → Builds containing the updated theme must include the app helper; release coordination remains separate from implementation.
- [Other brands still need the same change] → Port the select error template and SCSS edits for error alignment and mobile layout as well as the behavior to the other three branches; preserve their labels and other styles. Budsies and Budsies Education have six extra SCSS lines.
- [The day select remounts when its range changes] → Accept the small local lifecycle cost to prevent stale keyboard choices without changing the dependency. The surrounding provider and all form/order state remain mounted.
- [The helper has no invalid-month handling] → Accepted: its only planned caller uses fixed month options 1–12; both empty values (`undefined` and `''`) are handled as no month before calling it.

## Migration Plan

No data migration or API adapter deployment is needed. Existing Magento ignores the additional top-level field; #37259 uses it when order verification is enabled. Release the app export with any theme build using it, and complete the other brand ports before enabling Magento's order requirement. A rollback before backend enforcement can restore the previous app/theme bundle; after enforcement, reverting the order attributes would break birthday submission and must be coordinated with the backend.
