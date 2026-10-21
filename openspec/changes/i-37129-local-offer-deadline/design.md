# Design

## Context

See [proposal.md](./proposal.md) and [the delta](./specs/cart-offer-deadline-presentation/spec.md). Sources are the supplied ticket files and approved #37128 contract; the production cutoff confirmation is supplied evidence, not a new production query.

Base: `petsies-theme` / `83b88c61a24fef6cb402451df86c1655caec25d0`, matching `origin/HEAD`. Theme gitlink: `c15bc188df736351bc68908826d587bfc259bab3`; preserved checkout: `7ab93b714ba0ce7717020858e6031eb92dcbae79`. Examined cart/checkout callers and `e2e-tests/` have no differences between those revisions. No theme or gitlink edits are needed.

| Observed source | Constraint |
| --- | --- |
| Both module consumers pass `toRef(props, 'estimatedShipment')` to `useEstimatedShipment` and conditionally render `._offer-expiration-date-text` | Change the shared deadline computed; retain templates and shipment promises. |
| `core/modules/cart/index.ts` loads saved items only on the client; cart state starts empty. Theme `pages/DetailedCart.vue` gates items with `!isMounted || !cartIsLoaded` through hydration | Normal cart SSR renders a loading shell; no page-wide SSR controls. |
| Theme `pages/Checkout.vue` → `o-cart-items-table.vue` → `o-order-content.vue` uses configuration; review also uses it in `o-confirm-order.vue`. `core/pages/Checkout.js` reloads cart in `beforeMount` | Client data arrives at different lifecycle points; shared pre-mount output must be deterministic. |
| `core/modules/cart/helpers/cartCacheHandler.ts` persists whole items; `get-local-storage-items.function.ts` restores cross-tab items. `store/actions/synchronizeActions.ts` loads `current-cart`, but `performSync` can skip fetching | Real old date-only values survive rollout; compatibility belongs at the display boundary. |
| `pullEstimatedShipments` commits `CART_UPDATE_ITEM_ESTIMATED_SHIPMENT`, dispatched by theme `o-shipping.vue::saveDataToCheckout`; normal merge/update also carries shipment metadata | Ordinary refresh replaces data. The dedicated mutation is not a cache-writer item mutation, so persisted legacy removal is not guaranteed. |
| `core/application-services` provides `useI18n().t`; theme `resource/i18n/en-US.csv` contains the message key | Use the adapter locally, with no adapter or translation-file changes. Existing date formatting uses runtime defaults. |

Current `production-time-option-presentation` and archived `i-37022-update-holiday-period-options-display` retain Magento shipment promises; archived `i-36870-refine-production-time-option-display` retains commercial rules. `application-service-access` and archived `i-36838-replace-vue-instance-service-access` require injected services. No existing capability owns expiration presentation.

## Goals / Non-Goals

**Goal:** A shared local deadline with deterministic initial output and concrete compatibility for saved old data.

**Non-goals:** Shipment-promise, eligibility, production-option, storage, request-scheduling, adapter, or theme changes.

## Decisions

### Formatter and type

In module `composables/use-estimated-shipment.ts`, obtain `t` from `useI18n()` in setup. Use `Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value))`, interpolated through the existing translated message. Supply neither `timeZone` nor `hour12`. Seconds remain in the instant but are omitted without rounding: `03:59:59` represents minute `03:59`, never `04:00`. Intl already does this; add no rounding/truncation helper.

Change only `offer_expiration_date` in module `types/estimated-shipment.interface.ts` to optional `string | null`; comment the UTC RFC 3339 `Z` API contract and real date-only saved-cart legacy. Separate consumer formatters, a business timezone, and adapter extensions add no value here.

### Lifecycle and compatibility

Use a setup-owned `ref(false)` per instance, set true by `onMounted`. Before readiness, return `undefined` without parsing/formatting the deadline. Existing consumer `v-if` directives omit it during SSR and initial hydration; the next render tick after mounting adds local text. A bare `!isServer` guard could format during initial hydration. Leave the sibling shipment-promise computed unchanged.

After readiness, omit missing shipment/field, null, existing empty string, and exactly `^\d{4}-\d{2}-\d{2}$` legacy values. Their lost instant cannot be reconstructed. Keep the cart usable until ordinary merge/update or shipment refresh replaces the data. Existing prop refs/computed state handle timestamp replacement and null/absent removal. Immediate refresh cannot be assumed from source; no new refresh, watcher, timer, reload policy, or migration is needed.

### One root-owned test suite

Add only `src/modules/customization-system/test/unit/composables/use-estimated-shipment.spec.ts`, using the real composable in a small Vue setup harness with existing Jest/jsdom/Vue Test Utils and `test/unit/utils/application-services.ts::mountWithApplicationServices`.

- **Harness cases:** fixed native-timezone oracle below; one spy delegated to native Intl verifying locale `undefined` and no explicit `timeZone`; compact missing/null/empty/legacy table; one reactive legacy→timestamp→different timestamp→null/absent sequence; translated interpolation and existing shipment-template substitution/semicolon behavior.
- **Two UTC-only consumer smoke cases:** directly import each real `.vue` consumer, pass identical shipment props with otherwise empty/default props, and check its mounted deadline node matches the harness result and its promise remains visible. Do not repeat the harness matrix or reactive/hydration cases per consumer.
- **One UTC-only lifecycle case:** reuse `src/modules/shared/test/unit/additional-content.spec.ts`'s `createRenderer`/`renderToString`, DOM host, `$mount(element, true)`, and `Vue.nextTick` pattern on the setup harness. Supply the existing `createApplicationServiceProviders` to its root. Assert server HTML and client `beforeMount` omit the deadline, its formatter is not called during SSR, hydration reports no warning, and mounted output matches the fixed UTC oracle. No server formatting means no server-timezone dependency; no simulated SSR framework is needed. This covers the shared boundary, while normal cart SSR uses the observed loading shell.

The configuration component imports broad barrels. Use these exact test doubles, selected from its runtime imports:

| Import | Replacement |
| --- | --- |
| `src/modules/customization-system` | Export real `useEstimatedShipment`, `getCustomizationValueIdFieldKey`, and `isFileUploadValue` with `jest.requireActual` of direct files `composables/use-estimated-shipment`, `helpers/get-customization-value-id-field-key`, and `types/is-file-upload-value.typeguard`. |
| `src/modules/shared` | Only `useMobileObserver`, returning `{ isMobile: ref(false) }`. |
| `@storefront-ui/vue` | Simple render stubs for `SfIcon` and `SfProperty`; empty customization/product-option props avoid their branches. |

The shipment-promise component imports the composable directly and needs no other doubles. Keep provider code unchanged. This avoids loading the barrel's unrelated components/services without replacing deadline behavior.

For `2026-10-22T03:59:59Z`, select these **hardcoded** en-US expected values by process `TZ`:

| Timezone | Calendar/time oracle |
| --- | --- |
| America/New_York | October 21, 2026, 11:59 PM |
| America/Los_Angeles | October 21, 2026, 8:59 PM |
| UTC | October 22, 2026, 3:59 AM |

Assert these literal date/hour/minute/day-period values in production output, normalizing punctuation/whitespace, plus a short timezone label allowing abbreviations or GMT offsets. Native parts may identify the zone token, but must not calculate the date/time oracle with a formatter equivalent to production. UTC also rejects `4:00 AM`. Use real native Intl in separate processes, not runtime `TZ` mutation. The locale-selection test suffices; no de-DE process gate. Consumer and lifecycle cases run only in the UTC process.

Planned commands from the root after the suite exists:

```sh
LANG=en_US.UTF-8 TZ=America/New_York yarn test:unit --runInBand --runTestsByPath src/modules/customization-system/test/unit/composables/use-estimated-shipment.spec.ts
LANG=en_US.UTF-8 TZ=America/Los_Angeles yarn test:unit --runInBand --runTestsByPath src/modules/customization-system/test/unit/composables/use-estimated-shipment.spec.ts
LANG=en_US.UTF-8 TZ=UTC yarn test:unit --runInBand --runTestsByPath src/modules/customization-system/test/unit/composables/use-estimated-shipment.spec.ts
yarn type-check
yarn eslint src/modules/customization-system/composables/use-estimated-shipment.ts src/modules/customization-system/types/estimated-shipment.interface.ts src/modules/customization-system/test/unit/composables/use-estimated-shipment.spec.ts
```

`test/unit/jest.conf.js` discovers this path; root `package.json` supplies the commands. The touched slice is two production files and one new test file.

### One browser smoke, actual consumers only

At `https://$DEFAULT_STORE_DOMAIN`, use one en-US/UTC pass. Existing theme references: `e2e-tests/tests/checkout/cart.spec.ts` uses `/p/voice-recorder/` and `fixtures/cart-page.ts`'s `simpleProductPage`; `page-model/product/simple-product.ts::addToCartAndVerifyResponse` waits for `/api/cart/update`. `page-model/cart/cart.ts::goto` opens `/checkout/cart/`; `fixtures/checkout-page.ts` provides `CheckoutPage`, whose `goto()` clicks Go to checkout. Inspect the detailed-cart shipment consumer and checkout-summary configuration consumer, then stop.

Before adding that local fixture item, intercept successful `/api/cart/update` responses and replace only `result.extension_attributes.estimated_shipment.offer_expiration_date` with the supplied timestamp, creating the shipment object if absent. Preserve code, identity, options, and remaining fields. On ordinary `/api/cart/pull` responses during navigation, apply the same replacement to that fixture item's entry in `result[]`. `core/lib/sync/task.ts` consumes this `code`/`result` envelope; `mergeActions.ts::processUpdateServerItemResponse` passes the returned item to `updateClientItem`, and the Budsies additional-fields handler copies shipment metadata into Vuex. Thus responses reach the real props through the existing flow; interception does not itself replace already-loaded props. Add no refresh to force a pull: the initial update response supplies the fixture even if pulling is skipped.

Verify both deadline nodes contain the fixed UTC date/time and a zone label. Legacy/reactive and three-zone checks belong to the harness, not this smoke. No new theme test file, broad E2E run, shipping-form progression, order submission, or payment is required.

## Risks / Trade-offs

- [Observed saved/cross-tab values lack an instant] → Omit only that deadline until ordinary refresh; promise neither immediate display nor persisted legacy removal.
- [Actual SSR/client startup differs in data availability] → Local mounted readiness plus one hydration test; retain the cart loading gate.
- [Existing promises/commercial rules share the flow] → Retain their behavior and deploy Magento #37128 first.

## Migration Plan

Magento #37128's timestamp contract must be live before the frontend release. Release the focused root change after checks; no data migration or new refresh accompanies it. A frontend revert leaves timestamps readable by the old Date call but loses time/timezone detail. Keep the Magento contract deployed to avoid restoring date-only data.

No unresolved decisions. Implementation tests/browser checks above are planned, not executed proposal checks.
