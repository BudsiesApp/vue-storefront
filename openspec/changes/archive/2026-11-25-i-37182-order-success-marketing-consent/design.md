# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. The checked-out app already registers `checkout-marketing-consent` and clears its persisted selection on `order-after-placed`/logout. Regular checkout (`core/pages/Checkout.js`) and Express Checkout (`components/checkout/express-checkout-buttons.vue` in the theme) keep `{ order, confirmation }` in `checkout/getSuccessOrderData`. The placed order retains its payment extra fields after selection cleanup.

The theme already has `o-marketing-consent.vue`, `m-phone-input.vue`, `use-phone-input.ts`, typed application services, Privacy Policy Links outlets, and the birthday form's request/error-notification pattern. `OMarketingConsent` currently shows the phone only when SMS is checked and retains the last emitted non-empty phone while tracking validity separately. `usePhoneInput` currently displays parsable parent values but does not emit their canonical value, and its unparseable-parent branch leaves the input blank. Those two prefill gaps matter when the billing phone is used without an edit.

The companion API change lives in `vue-storefront-api/openspec/changes/i-37182-order-success-marketing-consent/`. Theme work is in the current `src/themes/petsies-capybara` submodule (Petsies line). No second theme checkout is required.

## Goals / Non-Goals

**Goals:** Keep order-specific policy in the Success form, shared presentation in the existing consent control, and I/O in its Vuex module. Meet the requirements with existing APIs plus small local extensions (cost rungs 2–4).

**Non-Goals:** New selection storage, reading the cleared Contact draft, tracking a last Contact phone, restoring Success after reload, detecting Magento's silent business declines, modifying order placement or authentication, and mounting Budsies/Waggables/Bulk Orders Success pages. Budsies mounting is a separate integration prerequisite for its page-level store check, not a task on this checkout.

## Decisions

### 1. Derive eligibility from the placed order, without new state

Add pure exported helpers in the existing module: one maps the placed order's consent object to `{ email: boolean, sms: boolean }` using strict `=== true`, and one intersects `consentAvailability(settings)` with channels not already accepted. Reuse the existing availability/settings types and composable. A missing order consent object/key is false, as produced by Express Checkout. Do not consult `SELECTION_GETTER`, mutate the order, or repopulate consent Vuex state.

The parent passes `confirmation.magentoOrderId`, `order.personalDetails.emailAddress`, `order.addressInformation.billingAddress.telephone` and the derived accepted-channel pair to the new form. Magento order placement returns ids as decimal strings; `o2m.js` preserves that result in the confirmation, regardless of the parent's existing `orderId(): number` annotation. Define the new form's `orderId` prop with runtime types `[Number, String]` and TypeScript type `number | string`, and preserve it unchanged in the request. The API accepts positive integer numbers and canonical positive decimal strings and owns validation before URL construction; the storefront adds no second conversion or id-policy implementation. The form owns only component-lifetime draft, pending and completed flags. Missing id/email and no remaining channels are checked at its rendering boundary. Existing checkout routing continues to own what happens when Success data no longer exists.

**Alternative:** Preserve another Success selection or add a last-Contact-phone fallback. Both add lifecycle/storage semantics and conflict with existing cleanup; billing-only prefill covers the specified outcome at lower cost.

### 2. Extend the shared controls with two optional inputs

Add a `channels` restriction pair, defaulting to unrestricted, and `alwaysShowPhone`, default `false`, to `OMarketingConsent`. Compute displayed channels as settings availability AND caller allowance. Keep `isPhoneRequired = displayed.sms && value.smsConsent`; independently compute visibility as `displayed.sms && (alwaysShowPhone || value.smsConsent)`. Pass actual requiredness rather than hardcoded `true` to `MPhoneInput`. Gate visible validation feedback on requiredness too, so unchecking SMS hides a prior error even while the field remains visible. Hidden SMS never validates or displays the phone.

Retain the bound value shape, separate validity and `validate()`/focus contract, and existing `disabled` propagation. With default props Contact must behave identically and its existing tests remain intact. The component knows nothing about the order or API. Use a setup-owned typed ref exposing only `validate(): boolean` in the Success caller.

**Alternative:** Duplicate consent controls in Success or add order awareness to `OMarketingConsent`. Duplication increases regression cost; order awareness violates the existing reusable boundary. Two presentation inputs are the smaller supported extension.

### 3. Normalize parent phone prefills at the phone-input boundary

Extend `usePhoneInput`'s parent-value path to preserve unparseable raw text and explicitly report invalid validity. For a valid parsed prefill, emit `input` with canonical E.164 only if it differs from the supplied parent value, setting `lastEmittedValue` before emitting so the reflected canonical value is suppressed as an echo. An already-canonical E.164 parent value emits validity but no `input`; Contact's saved-selection restore must not trigger `OMarketingConsent.onPhoneInput`, mark the draft edited or invalidate the selection. Reuse `libphonenumber-js` and existing country-resolution logic; do not add a second parser in the form. Preserve in-progress edits when a parent reflects an emitted value. Invalid drafts must not inherit a prior valid result. Keep empty-parent clear, saved-E.164 restoration, shared-calling-code behavior and Contact's last-valid-phone retention unchanged.

The Success form initializes its phone from the billing prop once. The visible control can keep an invalid draft; only a successful checked-SMS validation authorizes transmitting the bound canonical phone. An unchecked SMS draft never enters the payload. The caller's conditional-requiredness rule controls when an error is shown; visibility alone does not make an invalid prefill mandatory.

**Alternative:** Normalize again while constructing the request. That leaves display and submission with separate interpretations and still does not fix invisible raw prefills. Correcting the reusable intake boundary is the smaller coherent change.

### 4. Use a stateless Vuex request action and an explicit payload

Add a typed request (`orderId: number | string`, `email`, optional `emailConsent`, `smsConsent`, `phone`) and an action constant in the module's existing action/type structure. The action preserves a real confirmation id such as `"123"` in JSON rather than coercing it; the companion API validates that canonical decimal string. Export the namespaced action name, helpers and types through `index.ts`.

The action calls `TaskQueue.execute()` with POST JSON, Accept/Content-Type headers, CORS mode and `silent: false`, following `budsies/shareBirthday`. Build the URL from `config.budsies.endpoint + '/marketing-subscription-requests'` through `processURLAddress()`; do not add `token={{token}}`. Return `result` for `resultCode === 200`, otherwise throw. The action neither commits consent state nor accesses storage. TaskQueue already adds the current store code when multi-store mode is enabled; do not manually duplicate that logic.

Construct the request in the Success caller from the order identity and displayed choices: each displayed channel gets its true/false boolean, hidden channels are omitted, and phone is present only for checked SMS after validation. Disable/reject submission when no displayed choice is checked or pending, validate using the typed child handle, then set pending until `finally`. Do not send the order object or arbitrary form state.

**Alternative:** Direct component fetch, the mailing-list action, or a new request service/state machine. These bypass existing boundaries, send unsuitable authentication/data, or add unnecessary infrastructure. The existing action/TaskQueue path is sufficient.

### 5. Keep the Success view small and application-scoped

Create `components/organisms/OOrderSuccess/m-marketing-subscription-form.vue` using Vue 2.7 Composition API and `useStore()`/`useI18n()` from application services. Extract a focused theme composable if the draft/payload/submit behavior makes the component unwieldy; do not create a generic form framework. Use semantic `useAdditionalContent(AdditionalContentOutlet.PRIVACY_POLICY_LINKS)` entries, as existing registration and birthday forms do.

Use a real `<form novalidate>` with submit handling that always reaches the consent control's `validate()`. The phone still receives conditional requiredness, but native constraint validation must not intercept checked-SMS empty-phone submission before the associated error and focus can be applied. Preserve the exact specified text order, trusted administrator checkbox HTML through the shared control, and existing theme spacing/colors. Use an uncolored box with the order-item border and centered heading, description and acknowledgment. The primary Subscribe button is right-aligned on desktop, full-width on mobile, and visibly dimmed when disabled. Mount immediately after the confirmation-email heading block and before `_content` in Petsies `o-order-success.vue`, without moving or renumbering existing sections. Localize through `resource/i18n/en-US.csv` using the existing extraction command.

On any `200` action completion, replace the editable form with the acknowledgment, without interpreting truthiness. Catch failures only here, emit `notification/spawnNotification` using `notifications.createNotification` with danger type and translated "Something went wrong" (the birthday form pattern), preserve draft values and clear pending in `finally`. Do not add automatic submission, retries, redirect or reload persistence.

**Alternative:** A new persistence or cross-module event protocol adds ownership without a consumer. A component-local request lifecycle is enough; the existing module remains responsible for Contact cleanup.

## Risks / Trade-offs

- [Magento can return `200` for declined orders] → Treat every `200` as acknowledgment; no new status lookup or misleading local acceptance inference.
- [Store routing is configuration-dependent] → Check the Success-page request's store code and corresponding Magento store, not only a direct API call. The API's Budsies extension currently imports `multiStoreConfig` from `platform/magento1/util` even for Magento2 calls; that is an investigation signal, not proof of a runtime mismatch. Report a demonstrated mismatch rather than silently rewriting shared routing.
- [Budsies integration is absent on this Petsies checkout] → Reuse the shared component without implementing a second mounting here. Petsies page-level store verification is required now; Budsies verification remains open until its separately delivered mounting exists. A direct VSF API request does not satisfy that check.
- [Raw billing phone is external order/address data] → Normalize once at the existing phone boundary and use its validity contract. No duplicate parser or stale-phone submission fallback.
- [National billing phones have no inferred billing-country context] → The phone control still defaults to US and parses national prefills against its selected country; a UK national number such as `020 7946 0018` can initially be invalid until the customer changes the selector. Accept this editable-prefill limitation rather than add billing-country plumbing; international `+` prefills resolve through the existing parser.
- [No Success restoration] → Keep existing page lifecycle and guard the new component's required identity; no storage/recovery subsystem is added.
- [Shared control changes affect Contact] → Run existing Contact/consent/phone regressions alongside new option/prefill tests, including checked-invalid-unchecked SMS while the phone stays visible.

## Validation Approach

Unit coverage belongs beside the current module and theme tests: strict accepted-channel mapping, missing consent/Express orders, availability intersection, token-free action URL/body with both numeric and real string confirmation ids (`"123"`), and non-200 rejection; restrictions and default Contact behavior; initial formatted/unparseable phone values without an edit; no `input` for an E.164 parent value; Contact restore retaining its saved/in-memory selection; Success render guards, false/omitted channel distinctions, E.164 payload, pending/duplicate-submit protection, phone validation, acknowledgment and retry notification. Include a real-phone-control path so a valid prefill cannot pass a mocked validity check while submitting raw billing text, and assert `novalidate` on the Success form.

Inspect the integrated Petsies view in a browser at desktop and mobile widths, including no consent, one channel remaining, invalid phone, pending, success and failure. Use the actual Subscribe button with checked SMS and an empty phone to confirm custom error/focus appears instead of native validation intercepting submission. Confirm content order, keyboard labels/error association, working consent/privacy links and no horizontal overflow. Independent end-to-end verification includes regular and Express entry paths, reload without new error, and order-store routing; Budsies is pending its separate mounting.

## Migration Plan

No data migration. Release Magento #37180 first, the companion VSF API endpoint second, and the storefront last. Roll back by removing/reverting the storefront feature before removing its API dependency; existing Contact consent and the existing mailing-list route continue unchanged. No deployment is part of implementation.
