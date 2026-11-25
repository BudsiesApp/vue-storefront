# Tasks

## 1. Order policy and request action

- [x] 1.1 Add pure placed-order accepted-channel and remaining-channel helpers in `src/modules/checkout-marketing-consent`, reusing existing settings/availability types; verify strict true mapping, missing consent/keys, Express-shaped orders and settings intersection in module unit tests.
- [x] 1.2 Add the typed subscription request with `orderId: number | string`, Vuex action constant and stateless TaskQueue POST action; export the public helpers/types/namespaced action through `index.ts`; verify action tests preserve numeric `123` and actual confirmation-shaped `"123"` ids in JSON, assert endpoint without a token parameter, `200` true/false returns and non-200/rejected-request propagation without consent state or storage writes.

## 2. Shared consent controls and phone prefills

- [x] 2.1 Add optional `channels` restriction and `alwaysShowPhone` inputs to theme `o-marketing-consent.vue`, intersecting restrictions with settings and separating phone visibility from requiredness; verify new prop tests cover hidden SMS, unavailable channels, unchecked visible phone, checked invalid phone and clearing the error on uncheck.
- [x] 2.2 Update the parent-value intake in theme `helpers/use-phone-input.ts` to emit canonical E.164 only when valid and different from the supplied value, setting `lastEmittedValue` before emission, and retain unparseable text with invalid validity; verify tests cover formatted international/selected-country national prefills without editing, invalid parent data after a valid value, no `input` on E.164 restore, one emission without an echo loop for normalization and empty-parent clear.
- [x] 2.3 Keep existing `o-marketing-consent`, phone-input and Contact consent regression expectations unchanged and add a Contact restore integration case with the actual phone control; verify a restored SMS-checked E.164 selection emits no draft edit or selection-clearing mutation, while default Contact visibility, validation, phone retention and settings-driven labels still pass.

## 3. Success form

- [x] 3.1 Create Composition API `OOrderSuccess/m-marketing-subscription-form.vue` with an `[Number, String]` / `number | string` order-id prop, email/phone/accepted-channel props, local draft, required render guards, specified text order, read-only email, restricted shared controls and Privacy Policy Links outlet; verify render tests cover each remaining-channel combination, unavailable settings, missing identity, accepted `"123"` confirmation id and privacy content.
- [x] 3.2 Implement guarded submit on a `<form novalidate>` through a setup-owned typed consent-control handle and the exported Vuex action; verify tests assert `novalidate`, preserve a `"123"` order id and cover disabled no-selection/pending states, repeated submission, disabling all inputs, custom SMS-empty/invalid rejection and focus, email-only with invalid phone, shown false choices, hidden-key omission and E.164 phone only with checked SMS.
- [x] 3.3 Implement acknowledgment for every successful action result and the existing danger-notification pattern on rejection, retaining choices and phone for retry; verify success (including false result) replaces editable fields and failure restores enabled controls with unchanged values and "Something went wrong".
- [x] 3.4 Add a component integration test using the actual consent/phone controls to submit a valid formatted billing prefill without editing; verify the dispatched phone is E.164, and an unparseable prefill stays visible but cannot submit while SMS is checked.

## 4. Petsies integration and presentation

- [x] 4.1 Mount the shared form below the confirmation-email line and before the numbered sections in Petsies `o-order-success.vue`, passing the placed order's Magento id without conversion, email, billing telephone and derived accepted channels; verify a mounting test with `magentoOrderId: "123"` observes these order-derived inputs and that existing sections remain in order.
- [x] 4.2 Style the light subscription box for desktop/mobile using existing theme tokens and add the new strings with `yarn update-i18n-files`; verify `resource/i18n/en-US.csv` contains the specified messages and no unrelated extraction changes are included.
- [x] 4.3 Inspect the integrated Petsies form in a browser at desktop/mobile widths with no accepted channels, one remaining channel, invalid phone, pending, success and failure states; activate the actual Subscribe button with checked SMS and an empty phone to verify the custom phone error/focus runs instead of native validation, and verify placement, content order, mobile full-width button, keyboard/error association, working label/privacy links and no horizontal overflow.

## 5. Implementation validation

- [x] 5.1 Run the focused app-module/theme Jest tests, then `yarn test:unit:maintained --runInBand` and the applicable lint/build checks; verify changed-code tests and validation pass, reporting any pre-existing failures separately rather than changing unrelated work.
- [x] 5.2 Run `openspec validate i-37182-order-success-marketing-consent --strict`; verify the final implementation still matches the scoped specs, with no Budsies mounting, new persistence, changed Contact consent policy or modification of the existing mailing-list route.
