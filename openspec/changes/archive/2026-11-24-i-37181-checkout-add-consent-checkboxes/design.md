# Design

## Context

See [proposal.md](proposal.md) for motivation. This change spans the app, its `petsies-capybara` theme submodule, and the separate `vue-storefront-api` repository.

- `theme/components/organisms/o-personal-details.vue` owns Contact, including OTP/registration, name persistence and Continue. It already renders the privacy-links Additional Content outlet independently of the form inputs.
- `backend-settings/getSettingByCompositeKey` exposes backend settings reactively; no `marketingConsent` consumer exists yet.
- `core/pages/Checkout.js` builds regular orders in `prepareOrder()`. The theme Checkout page mixes it in. Express buttons instead call `core/modules/checkout/composables/use-order-creation.ts`. Both dispatch `checkout/placeOrder` and eventually use shared order hooks, so a shared hook cannot safely choose the regular checkout policy.
- `persisted-customer-data` already stores the last-used phone. Shipping and Billing read it only into empty phone fields. Its customer-data hash includes the phone; a changed hash emits `UserEvents.CUSTOMER_DATA_CHANGED` (`customer_data_changed`).
- `order-after-placed` is emitted by the shared order lifecycle, including Express Checkout. The placed order is already retained in `order.last_order_confirmation.order`. Order preparation and optimization preserve `addressInformation`.
- VSF API `src/platform/magento2/o2m.js` currently maps only payment method and additional data into `api.cart.order()`. The installed client already selects mine, guest or admin routes and forwards the supplied body; no client fork is needed.

## Goals / Non-Goals

**Goals:** Use existing settings, order transport, customer-phone persistence and EventBus contracts. Keep consent policy at the regular-theme order-construction boundary and the API adapter business-agnostic. Put reusable component logic in typed composables and pure helpers rather than expanding the Contact organism with a new subsystem.

**Non-Goals:** Subscription API calls, status-based pre-checking, mounting/submitting the form or adding state on the Success page (#37180), Bulk Orders UI, shared order-hook consent injection, address-phone rule changes, a second address-prefill path, custom phone metadata or a storage transaction framework. Extracting the consent form for later Success-page reuse is included. Trusted administrator HTML is not sanitized by this feature.

## Decisions

### 1. A small app module owns saved selection; Contact owns its email-bound draft

Add `src/modules/checkout-marketing-consent/` with focused `types`, `helpers` and `composables` files and a namespaced Vuex module in the repository's standard `store/` layout (state, getters, mutations, actions, store name). Consumers read the saved selection through a selection getter rather than the module state. Register it from the theme's `config/modules.ts`, not the global order module. Use Vuex mutations for state changes and actions for storage I/O. New Composition API code obtains the application store from `core/application-services`, not the process-global store or a component instance.

The durable record is one nullable `{ email, emailConsent, smsConsent, phone }`, separate from `checkout.personalDetails`. A single latest selection is sufficient; do not keep an email-indexed history. Compare email keys after trimming and lowercasing. Restore choices only for the current Contact email. A draft started before any email is entered remains unbound through the first email entry, including incremental typing, and adopts that first email when it is confirmed by the existing Contact flow. This preserves checks made before typing an email. Once associated with an email, changing it while editing or during OTP/account confirmation cannot reassign old checks to a different email: reset the choices and phone. Case-only changes retain the choice.

Hydrate through `StorageManager` in the browser before applying a saved selection, and save only on a successful Contact Continue, after phone validation and existing login/registration have succeeded. Unchecking SMS retains its last canonical phone; hidden/unoffered channels cannot retain an effective true choice. Returning through steps reuses the saved selection. Reload retains existing checkout routing: a document reload redirects to Cart, and the choice restores when the same-email customer reopens Contact; do not change the canonical checkout navigation contract.

Editing a saved draft or changing its associated email clears only the in-memory selection with `setSelection(null)`, so browser Forward cannot submit a previously accepted choice after it was changed. Editing does not remove the stored record: there is no `invalidate` action, storage-removal promise or save-time wait for invalidation. The edited draft replaces the stored selection only after successful Contact continuation. A draft first edited while an email is already present is bound to that email immediately; only a draft genuinely started without an email remains unbound through initial email entry.

Contact Continue is the authoritative validation boundary: only a valid phone can be saved with checked SMS. Read saved choice flags with `=== true`; do not add record-shape validation or re-parse the phone during hydration or order building. The new storage key has no legacy records to migrate, and Magento owns order-time consent normalization.

Use plain `StorageManager` get/set/remove actions with one storage key and the default localStorage-backed collection; do not add cross-tab synchronization or a storage-event listener. Browser access stays behind `!isServer`; SSR starts without user consent state. Rely on the storage wrapper's existing error handling without another catch/logger or session-only fallback. No consent API call belongs in hydration, save, checkbox watchers or restoration.

Register `order-after-placed` and `user-after-logout` cleanup at module initialization, so they work from Cart/Express without Contact mounted. Both use one `clear` action, which commits `setSelection(null)` and removes the stored record. Contact is removed after a regular order and is not open during the existing Express/logout flows; the next checkout creates a fresh draft. Do not add a revision counter or watcher to reset an open draft on cleanup. Use the existing successful-order event rather than clearing at submission, so failures preserve a retryable selection. Clearing the selection does not erase the independent last-used phone or mutate the order confirmation.

**Cost:** Reuse storage and lifecycle code (rungs 2–3) with a small typed selection/composable layer (rung 4). Keeping state in Contact alone misses unmounted Express/logout cleanup; putting it in checkout personal details loses it when wallet details replace those fields. A new cross-tab transaction/version protocol or account subscription store adds ownership with no required benefit.

### 2. Settings-driven Contact controls and a narrow validation bridge

Read `marketingConsent` through `backend-settings/getSettingByCompositeKey`. A small typed view derives labels and offered-channel flags; absent settings produce false flags. Reuse this one policy in the consent form and in order payload construction so hidden channels are omitted consistently. Evaluate current settings, and mask saved choices by availability rather than letting a saved true override a hidden control.

Move the consent block into a self-contained, reusable theme consent-form component, and render it immediately after the last-name field and before the mobile promotion code in Contact. Its boundary:

- It reads the labels and offered channels from the backend settings itself, so a caller does not pass labels or availability. It renders only the offered checkboxes, with administrator HTML in the `SfCheckbox` label slots, and the generic phone molecule while offered SMS is checked.
- Its value is a `v-model` of `{ emailConsent, smsConsent, phone }`; every customer edit emits a new value object. The caller may also disable it, as Contact already disables its inputs.
- It tracks phone validity and owns the phone error presentation. It exposes `validate()`, which shows the phone error when offered SMS is checked without a valid phone, focuses that field and reports whether the value is valid. Without checked offered SMS it is valid.
- It knows nothing about the checkout: no localStorage or Vuex consent selection, no email association, no persisted customer phone, Contact navigation or order placement.

Contact (its organism and the checkout consent composable) binds its email-bound draft to the form's `v-model`, calls `validate()` on Continue, and keeps email binding, persistence, last-used-phone commits and Continue/order submission. Order Success can later bind its own value and actions to the same component. Do not mount it on Order Success or add that page's submission behavior in this change.

Keep anchor interactions working without toggling the checkbox as a side effect. Preserve the existing privacy-links outlet and its placement in Contact, outside the extracted form. Do not add a heading or country notice. Use existing responsive spacing and visible focus/error conventions; labels and errors introduced by the component use theme translations, while backend consent HTML is rendered as supplied. The extracted block does not introduce a nested HTML form or its own submit button.

Compose consent logic into Contact's existing `setup()`. Contact reaches the form only through its `v-model` and a setup-owned typed ref limited to `validate()`, rather than traversing child `$refs`. Continue touches existing Contact validation and calls the form's `validate()`, which requires a phone only when the offered SMS checkbox is checked; invalid phone feedback stays associated with its input and participates in first-error focus/scroll. Unchecking removes the phone requirement. Keep OTP/registration and navigation behavior intact for guests and logged-in customers; any new authentication check uses `user/isLoggedIn`.

**Cost:** Reuse existing controls and Continue flow (rung 2) with a small consumer-specific extension (rung 4), not a replacement Contact/login form or validation-framework migration.

### 3. Generic international phone molecule uses installed metadata

Add `theme/components/molecules/m-phone-input.vue`, with focused parsing/country helpers or a composable alongside theme helpers as needed. It has a Vue 2 `value`/`input` E.164-or-empty contract, a separate validity notification, and parent-controlled required/error presentation. It has no store, storage, SMS labels or consent settings. Its local editing state owns selected country and national text; the parent owns whether it is required.

Lay out the compact country-code selector and number input side by side on one line at mobile and desktop widths, with the number taking the remaining width. The collapsed selector displays only the selected calling code with `+` (for example `+1`); its opened options still display country names and calling codes. Keep accessible control labels and error feedback without making the selector a full-width country-name field. Prefer the existing native selector with a compact collapsed presentation rather than introducing a custom dropdown subsystem; no parsing, ordering or validation rule changes are implied by this presentation change.

Build country options from installed `libphonenumber-js` `getCountries()` and `getCountryCallingCode()`, joining names from `@vue-storefront/i18n/resource/countries.json`, then sort names and put US first. The phone-options helper supplies the three names missing from that resource: `AC` = Ascension Island, `SS` = South Sudan and `TA` = Tristan da Cunha. Keep these small name additions local to the phone selector; do not change address-country options. Use the maintained library's parser, validity and calling-code country metadata, not a custom prefix table, regex-only validation or a new phone dependency. For national input, use the selected country as the parser's default and accept `isValid()` without comparing the detected country to the selection. This applies to every shared calling code: `416 555 0123` with US selected is accepted as `+14165550123` and leaves US selected. Only international `+` input or a parent E.164 value triggers country auto-selection. Do not change the existing shared address-phone helpers or address validation.

Use `autocomplete="tel"` and a single input-event parsing path for typing, paste and autofill. An international number is resolvable for normalization only when parsing succeeds and the parsed number's `isPossible()` is true. Use that check before selecting a country, applying the calling-code fallback or stripping the calling code; parser success alone is insufficient. Until then, preserve the text exactly as entered, including `+`, keep the selector unchanged, and report an empty public value with validity false; checked SMS therefore still blocks Contact Continue. Once resolvable, international input and parent E.164 values share normalization: an identified country wins; an unidentified country retains a matching selected calling code, otherwise uses that code's main country; the displayed normalized field contains the national number only. Use `isValid()` separately for validity and E.164 public-value emission: the possible but invalid `+1 555 555 5555` exercises the country fallback while still reporting invalid and an empty public value. Use complete valid examples in country-resolution tests: `+1 416 555 0123` selects Canada and `+1 212 555 0123` selects US. Do not infer countries from partial prefixes or add custom prefix metadata: stripping a partial `+1` too early would prevent later digits from identifying Canada. Invalid editing text stays visible locally while the public value is empty and validity false. Do not turn a parent echo of that empty value into erasure of the user's partial edit; an intentional parent reset clears the field. Use `v-if` for the SMS phone field. The draft keeps its canonical phone, and a re-created molecule restores country/national text from that value. Do not add state to retain an unfinished invalid edit across hiding the field.

**Cost:** Maintained library/resource reuse (rung 2) with a small UI wrapper (rung 4). A third-party phone UI package would add dependency/style/SSR integration cost; custom phone parsing would own protocol-like metadata unnecessarily.

### 4. Save the SMS phone through existing customer-data persistence

After successful Contact continuation, if SMS is offered/checked and its phone is valid, commit `SET_PERSISTED_CUSTOMER_PHONE_NUMBER` with the canonical E.164 value, alongside the existing Contact name/email commits. Unchecked or unavailable SMS never writes its retained phone to customer data.

This deliberately updates the single last-used phone. Existing Shipping and Billing prefills then see it and fill only empty fields; non-empty fields and later customer edits win. There is no Contact-phone fallback in either address form and no new source used to initialize an empty consent phone. Address changes continue to update the last-used phone normally, but never overwrite the independently saved consent phone.

The persisted phone feeds `CUSTOMER_DATA_HASH`; a change emits the existing `customer_data_changed` event and reaches its existing consumers, just as an address save does. This reporting is expected. “No consent sent on restore/Continue” forbids a marketing-consent submission, not ordinary customer-data reporting. Do not suppress that event or create a duplicate emitter.

**Cost:** Existing public mutation and prefills (rung 2). A second prefill source with precedence rules is more code and would conflict with the single last-used-phone model.

### 5. Decorate only the regular theme's order preparation

In `theme/pages/Checkout.vue`, extend the regular `prepareOrder()` method by calling `Checkout.methods.prepareOrder.call(this)` and applying a pure app-module payload helper to its returned order. Do not duplicate the core order builder or alter a global `orderHooks.beforePlaceOrder` hook. Leave `useOrderCreation().prepareOrderData()` and Express buttons unchanged.

The helper takes the current settings/availability, saved selection and final order Contact email. Build a fresh object with only offered channel keys; default them to false. Set a key true only for the matching saved email and a saved choice of `=== true`. Include the saved canonical phone only for true SMS; rely on Contact's validation rather than parsing it again. When the record is missing/mismatched, offered channels remain false with no phone. This final email check is necessary because account/wallet data can change after Contact. Merge the consent object into existing `paymentExtraFields` without overwriting unrelated extension fields. With no offered channels, do not add a consent object or create an empty extras object solely for consent.

The payload is added before the existing `checkout/placeOrder` dispatch. Shared order preparation, optimization and confirmation already preserve it, so no new Success-page state is needed. Its SMS phone is the selected consent phone, not whichever phone Billing or Shipping most recently saved.

**Cost:** Theme method extension (rung 3) and a small pure builder (rung 4). Shared-hook injection would require a new checkout-origin protocol and exclusion guards across unrelated order producers; copying the core builder would increase maintenance risk.

### 6. VSF API forwards generic extra fields at its existing place-order boundary

In `vue-storefront-api/src/platform/magento2/o2m.js`, add `paymentMethod.extension_attributes` to the existing order-call body only when `addressInformation.paymentExtraFields` is supplied, assigning the object unchanged. Preserve `method` and `additional_data`. All route variants use this one call; the installed client's `lib/cart.js` already routes it to customer, guest or admin order endpoints. Leave the client dependency, shipping extension mapping, worker retry logic and settings endpoint untouched.

Test the public `processSingleOrder` entry once with and once without generic extra fields, using mocked collaborators. Include an unrelated nested extension key to prove the API does not know about consent. Assert no `extension_attributes` property for the old order shape, not merely an undefined value, and preserve the method/additional data in both cases. This covers the one changed body-construction site shared by all three routes; do not add tests of the installed client's unchanged route-selection behavior.

Keep `paymentExtraFields` inside `addressInformation`. The existing order schema has a root additional-property restriction and its current CommonJS/default export mismatch is unrelated; do not fix or broaden schema validation in this change.

**Cost:** Small mapper extension (rung 4) around the existing client (rung 2), not a new endpoint, business-specific adapter or dependency fork.

## Risks / Trade-offs

- Unknown payment extension attribute on old Magento → Deploy #37178 before storefront emission. Do not add runtime feature probing, retry-without-consent, or silent data dropping; the release dependency is the compatibility boundary.
- A customer manually alters the new localStorage record → Accepted without record-shape or phone re-validation; Contact validates the real input path, saved flags use `=== true`, and Magento #37178 normalizes consent and declines invalid SMS without failing the order. Final order email/current channel availability are still checked because they can change through normal flows.
- Initial storage hydration overlaps order/logout cleanup → No extra race guard is added: hydration starts at module initialization before the customer can complete those flows.
- Storage is unavailable → Rely on the existing storage wrapper's handling; no new fallback, logging layer or failure-path tests.
- Customer-phone persistence can trigger analytics/customer-data consumers → This is intentional existing behavior, not a new subscription pathway. Test the new Contact phone commit, not the existing customer-data hash watcher or address-prefill implementation.
- One latest selection replaces earlier emails → Required to avoid inheritance; no history, TTL, subscription status or audit subsystem is built in the storefront. Magento owns the order-time consent record.
- Reload currently redirects to Cart → Restore when reopening checkout without changing established routing.
- Unsaved Contact edits are lost after reload → Contact shows the last saved choice again for the same email. Only the in-memory selection is invalidated while editing; successful Continue replaces the stored record, and order/logout cleanup removes it.
- Incomplete invalid national input is not a durable E.164 value → Preserve it only while the molecule remains visible; SMS uncheck/re-check and reload need not preserve an unfinished invalid edit. The canonical draft/saved phone restores through the component's existing parent-value contract, which may choose its detected country on re-creation.
- Trusted label HTML can contain links → Render only the configured administrator labels at the typed boundary. Sanitization is explicitly outside this change.

## Migration Plan

Development UI inspection requires local Magento #37178 (`37178-marketing-consent-checkout`) and configured non-empty consent labels with SMS enabled. Without them, no controls are expected: run unit/component checks and explicitly defer the feature's browser inspection until the environment is prepared. This is a prerequisite, not a request to deploy production or an implementation task to switch Magento branches.

1. The generic VSF API forwarding can be released at any time; old orders remain unchanged. Ensure it is deployed before enabling storefront payloads so choices are not silently dropped.
2. Deploy Magento #37178 before releasing the storefront consent feature. Its declared mixed payment extension attribute and order plugin own recording/normalization; do not reproduce backend consent processing in the storefront.
3. Release the app and companion theme changes together. There is no database migration or existing-selection migration; the new selection key starts empty.
4. If the storefront feature needs rollback, roll back app/theme emission first; the generic API forwarding and Magento support can remain. Do not remove Magento extension support while a deployed storefront still sends it. Completed order consent records remain backend-owned.
