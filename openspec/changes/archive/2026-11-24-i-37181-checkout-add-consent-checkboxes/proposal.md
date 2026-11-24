# Proposal

## Why

Regular checkout currently cannot collect email and SMS marketing consent with an order. Customers need an optional, accurate choice for their Contact email and SMS phone, using the administrator's consent wording and Magento's order-time recording support (#37178).

## What Changes

- Add unchecked, optional email and SMS controls beneath the Contact name fields in the Budsies, Petsies and Waggables regular checkout, in a self-contained consent-form component prepared for later Order Success reuse. The component reads backend `marketingConsent` settings to decide which controls appear, owns phone validation, binds `{ emailConsent, smsConsent, phone }` through `v-model`, exposes `validate()` and knows nothing about the checkout; HTML links work and the California Privacy Notice remains visible. Mounting/submitting that form on Order Success remains outside this change.
- Add a reusable international phone-input molecule, used only while SMS is checked. Its compact country selector and number input share one line; the collapsed selector shows only `+code`, while open options retain country names and calling codes. It supports international typing/paste/autofill, validation and E.164 output.
- Save one email-bound checkout selection separately from `checkout.personalDetails`, restore it without subscribing, and clear it after any placed order or logout.
- Save the valid SMS phone through the existing last-used customer-phone mechanism. Existing empty shipping/billing phone prefill and customer-data-change reporting remain in effect.
- Add only offered choices and an opted-in SMS phone to the regular checkout order's payment extension data. Express Checkout and Bulk Orders never add consent.
- Extend the separate VSF API repository's Magento order mapper to forward generic payment extension fields unchanged on every place-order route.

## Capabilities

### New Capabilities

- `checkout-marketing-consent`: Settings-driven Contact controls, email-bound selection lifecycle, last-used phone integration and regular-order consent payload policy.
- `international-phone-input`: Storage-independent theme phone molecule with international parsing and country-aware validation.
- `order-payment-extra-fields`: Generic VSF API forwarding of payment extension fields to Magento order placement.

### Modified Capabilities

None. Existing checkout navigation, address validation and EventBus contracts remain unchanged.

## Impact

- App repository: a small checkout-consent Vuex module, persistence/lifecycle integration, composable and payload helper; reuse backend settings and persisted customer data.
- Theme submodule `src/themes/petsies-capybara`: Contact organism, regular Checkout page, reusable consent-form and phone components, and localization. Registration is theme-specific; no payment-braintree changes are needed.
- Separate repository `vue-storefront-api`: `src/platform/magento2/o2m.js` and focused unit tests. No `/settings/retrieve` or dependency changes.
- Reuse installed `libphonenumber-js` and existing country-name resources.
- Deploy Magento #37178 and the generic API forwarding before enabling the storefront payload. The API change is backward-compatible and independently deployable; no new subscription endpoint or Success-page state is introduced.
