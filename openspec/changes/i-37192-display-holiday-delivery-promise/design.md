# Design

## Context

See `proposal.md` for motivation and the delta spec for behavior. This design spans shared app rendering, environment configuration, and the theme's translation catalog.

Discovery on the current `37192-display-holiday-delivery-promise` branches confirmed:

- The app HEAD is `83f5e687cf121b3740e8968dfc77631aaa64194a`; theme HEAD is `b6f3326ea01b5825125b62163704b27b12181fe6`. Both have no committed delta from their local `origin/petsies-theme` references. The pre-existing payment-braintree pointer difference is unrelated and remains untouched.
- Magento's canonical `order-history-holiday-shipping` spec exposes `shipping_holiday_name?: string` on each item in both `GET /V1/customers/me/orders` and `GET /V1/customers/me/orders/:orderId`, for every brand store including Petsies; the contract explicitly forbids restricting the attribute to Budsies. Magento removes the period's final year and supplies no delivery copy. Persisted holiday names survive cutoff changes and shipping; unlinked items omit the attribute.
- The VSF API routes in `vue-storefront-api/src/api/extensions/budsies/index.js` pass both responses through. `src/modules/orders-history/store/actions.ts` also preserves the returned items through its existing TaskQueue actions. No fetch, mapping, state, or backend changes are needed.
- The theme's `components/organisms/o-my-account-orders-history.vue` consumes the shared `OrdersHistoryList`. Shipment rendering has one chain: `order-view` → `order-item` → `order-item-extended-info` → `order-item-shipment-info`.
- Single-order consumers of `FETCH_ORDER_DETAILS` do not render this shipment-information chain. Both response shapes use the shared item type, but this change presents the promise only in the existing Order History list; no single-order shipment UI is added.
- `order-item-extended-info.vue` shows Shipment information only when `canShowProgressTracker` is true and the item has shipments or an estimate. `order-item-shipment-info.vue` shows an estimate only when its formatted estimate is non-empty and no actual shipment date was found. Shipment date is taken from the earliest dated shipment; tracking has a separate existing list.
- The theme catalog is `resource/i18n/en-US.csv` (the `yarn update-i18n-files` target), not the older `i18n/` path. It already has a literal `In time for Christmas` for another feature, but not the required named-placeholder message.
- No current canonical capability covers Order History holiday presentation. Existing production-time and cart holiday contracts use different fields and remain unchanged; photo-upload and reorder capabilities retain their current actions and eligibility.

## Goals / Non-Goals

**Goals:**

- Make a small presentation-only extension at the existing item rendering boundary, preserving API data and all visibility decisions.
- Allow a brand deployment to opt in without branching the shared account components.
- Keep localized estimate formatting intact and use the existing translation interface for the new wording.

**Non-Goals:**

- No new composable, Vuex field/action, API request, customer-data persistence, or brand-code conditional: the addition is a small computed presentation condition, not complex reusable logic.
- No frontend holiday calendar, current sales-mode dependency, eligibility calculation, cart/email change, year stripping, or holiday-name translation.
- No unrelated progress-tracker, item-action, shipment parsing, or configuration-system refactor; no changes to `config/default.json`.

## Decisions

### 1. Pass the optional item attribute to the existing shipment component

Add `shipping_holiday_name?: string` to `OrderItemExtensionAttributes`, the shared type used by items in both order-list and single-order responses. Bind the current list item's `extension_attributes?.shipping_holiday_name` as an optional `shippingHolidayName` prop from `order-item-extended-info.vue` to `order-item-shipment-info.vue`. Single-order consumers gain only the optional type field, not a new rendering path.

This keeps the component's shipment inputs explicit and naturally isolates mixed-order items. Do not copy the name to order-level state or derive it from sibling items. Altering TaskQueue actions or adding a separate lookup would duplicate data the existing responses already preserve.

### 2. Replace content only inside the existing visible-estimate branch

Keep `showShipmentInfo`, `showEstimatedShipmentDate`, `shipmentDate`, date formatting, and tracking iteration unchanged. A named computed selects the translated promise when `config.orderHistory?.displayHolidayPromise === true` and the optional holiday name is non-empty; otherwise it returns the existing estimated-date expression. Render that computed inside the existing estimated-date span. The new message replaces both label and formatted estimate, never appends to them.

Read configuration through the existing `config` import pattern. Use the API string without rewriting it. Vue text interpolation remains the output mechanism; do not introduce HTML rendering. The existing optional-string contract plus a simple non-empty condition is sufficient; no parsing, validation service, fallback lookup, or holiday map is warranted. Empty-string handling is explicitly required by D6 even though Magento's contract excludes empty values.

Per D9, even after the named holiday has passed, a still-unshipped item keeps this promise if its estimate branch is otherwise visible and the API still supplies the holiday name. Do not introduce a current-date comparison, expiration timer, sales-mode lookup, or alternative missed-promise copy. Magento owns any future eligibility change.

Do not use the presence of tracking records as a new shipped predicate: current estimate precedence is based on an actual shipment date. In particular, records without a date retain existing tracking and estimate-branch behavior. Moving holiday text outside that branch would incorrectly reveal promises for missing estimates or already dated shipments.

### 3. Use one named-placeholder translation in the theme catalog

Render `In time for {holidayName}` using existing `$t` template interpolation or the component's already injected `useI18n()` adapter when computing text in setup. Supply `{ holidayName }` as named interpolation data; translate only the surrounding message. Add the exact key/value to `src/themes/petsies-capybara/resource/i18n/en-US.csv`, leaving the existing Christmas-specific translation untouched.

Run the standard extraction command during implementation and verify the named-placeholder entry explicitly: the current extractor's regular expression does not reliably collect calls with interpolation arguments. If it misses the entry, add the single catalog row directly; do not expand this task into an extractor fix or unrelated catalog cleanup. Reusing the literal Christmas key would prevent dynamic holiday names and contradict D3.

### 4. Wire an explicit JSON boolean, off by default

Add a top-level section to `config/local.json.template`:

```json
"orderHistory": {
  "displayHolidayPromise": ${ORDER_HISTORY_DISPLAY_HOLIDAY_PROMISE}
}
```

This is a template fragment: the placeholder is deliberately unquoted so generated `local.json` contains a boolean. Add `ORDER_HISTORY_DISPLAY_HOLIDAY_PROMISE=false` to `.env.example`, a false-default environment entry (`ORDER_HISTORY_DISPLAY_HOLIDAY_PROMISE=${ORDER_HISTORY_DISPLAY_HOLIDAY_PROMISE:-false}`) to the app service in `docker-compose.yml`, and `'false'` to the runtime-configuration-generation step in `.github/workflows/test_vsf1.yml`.

The strict-true read handles valid configurations that omit the new section without changing `config/default.json`. Tests must explicitly provide such a configuration: node-config merges the developer's generated `config/local.json`, so absence in `config/test.json` does not guarantee absence in the effective test configuration. A quoted string, static true in the template, or brand-code list would violate the chosen per-brand boolean contract. No automatic default is added to arbitrary external template-rendering environments: those deployment definitions must supply the variable before building, as agreed in D2/D4.

### 5. Cover rendering and wiring with focused maintained tests

Place shipment component and extended-info regression tests under `src/modules/orders-history/test/unit/components/`, where the maintained Jest suite already discovers them. Exercise rendered text and child prop wiring rather than computed implementation details. Provide application-scoped i18n/store services through established test patterns or focused mocks; do not recover them from a Vue instance.

Every new shipment-info and extended-info test must set its own effective option state using the existing `jest.mock('config', …)` pattern or a per-test set-and-restore. Explicitly cover boolean `true`, boolean `false`, and the key absent; reset the controlled configuration between cases. Never use the ambient generated `config/local.json` or the assumed absence of a key in `config/test.json` as test setup. The same focused tests must pass regardless of whether the local Petsies verification environment has the option on or off.

Cover an enabled Christmas item, a different holiday with unchanged interpolated name, a still-unshipped linked item after the holiday date (D9), absent/empty holiday values, false/absent configuration, actual shipment date and tracking precedence, missing estimates, progress-blocked sections, and mixed item instances. For the post-holiday case, fix the test clock after the associated fixture's holiday and restore it afterwards; assert the same supplied-name promise, without adding frontend date logic. The mixed case must render the real extended-info → shipment-info handoff so it proves each item passes its own attribute. Existing available-action coverage remains a regression check; the implementation does not edit `order-item.vue` or its action renderer.

Check template substitution for both boolean values and repository defaults without modifying generated runtime files. Run focused module tests, maintained tests, changed-file lint, and the build according to the development workflow. End-to-end/local storefront verification belongs to the tester, not implementation task completion.

## Risks / Trade-offs

- [An external deployment omits the new unquoted variable and generates invalid JSON] → Before release, the operator must define `ORDER_HISTORY_DISPLAY_HOLIDAY_PROMISE` as `true` or `false` for every production brand, staging, and any non-Compose local template-rendering environment. Repository CI and Compose receive explicit false defaults; malformed generated JSON is not recoverable by the runtime optional-key read.
- [The API field is unavailable in an environment] → Missing item names intentionally retain estimates. Availability of Magento #37191 must be confirmed before enabling Budsies. Production rollout was reported in the task inputs, but no real logged-in production response was verified here, and none is required from this role.
- [Holiday names remain present after actual shipping or without estimates] → Reuse current visibility and date precedence instead of broadening eligibility. Their existing guarantees need no new guards.
- [A still-unshipped item can display a promise for a holiday that has already passed] → Accepted by D9: the API name remains the authority and the frontend must not infer eligibility from dates. No expiry guard or missed-promise wording is added; changing that policy belongs to Magento and is outside this change.
- [Unexpected API strings or invalid date values] → Accept existing API/date behavior; no trimming, type coercion, year removal, alternate data source, or invalid-date repair is added. The task supplies no evidence warranting those changes, and Magento owns name derivation.
- [Translation lives in a separate repository] → Deliver the app change with the companion theme catalog change on the existing task branch; do not overwrite or update unrelated submodules. Publication and merge mechanics are the operator's responsibility.

## Migration Plan

1. Implement app and companion theme changes on the existing task branches. No data migration or backend deployment is introduced.
2. Per D10 (amending D8), the tester verifies end to end on the available local Petsies account storefront from these shared branches with `ORDER_HISTORY_DISPLAY_HOLIDAY_PROMISE=true`, including a holiday item, a regular item, a mixed order, shipment/tracking precedence, and hidden sections/actions. Then set it to `false` on the same Petsies storefront and verify the unchanged estimate. This satisfies the issue's Budsies account-theme verification criterion through the shared renderer and all-brand API contract; no local Budsies storefront is required. Local fixtures or the local Magento may supply #37191 associations if needed, never production. Do not switch/fetch branches. Enabling Petsies here is for testing only, not an additional production rollout.
3. Before release, the operator provisions the variable for every external deployment and confirms the API contract is available; only Budsies sets it to `true` in production. Deploy compatible app and theme artifacts together through the normal release process.
4. To disable the presentation, set the deployment option to `false` and rebuild/redeploy through that process. This restores estimate presentation without data changes; any rollback to code using this template must retain the variable definition.
