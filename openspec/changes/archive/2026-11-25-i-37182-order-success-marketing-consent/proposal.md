# Proposal

## Why

Express Checkout bypasses Contact and currently offers no marketing consent point. Order Success should offer the available channels not already accepted with the placed order, without changing Contact or retaining another checkout selection.

## What Changes

- Add a settings-driven subscription form below the Petsies confirmation-email line and above its numbered sections, for regular and Express Checkout orders.
- Reuse `OMarketingConsent` with optional channel restriction and always-visible SMS-phone presentation; keep default Contact behavior unchanged.
- Prefill only the placed order's billing phone, normalize valid prefills to E.164 only when conversion is needed, and keep invalid prefills editable without turning an existing canonical Contact restore into an edit.
- Submit only displayed channel choices through the consent module and the new token-free VSF API endpoint, preserving the order id as a number or canonical decimal string for validation at the API boundary; show an acknowledgment or retain the form on failure.
- Share the form and controls with the Budsies theme, but do not mount it in that branch here. Bulk Orders and Waggables Success pages are excluded.

## Capabilities

### New Capabilities

- `order-success-marketing-consent`: Order-based channel eligibility, subscription form, payload, and response behavior.

### Modified Capabilities

- `checkout-marketing-consent`: Extend the reusable control contract through optional presentation inputs without changing Contact or its cleanup/persistence policy.
- `international-phone-input`: Define normalization and editable invalid display for externally supplied billing-phone prefills.

## Impact

- App: `src/modules/checkout-marketing-consent` helpers, request types, Vuex action and exports.
- Theme submodule: `o-marketing-consent.vue`, phone-input helper, new `OOrderSuccess/m-marketing-subscription-form.vue`, Petsies `o-order-success.vue`, tests and `resource/i18n/en-US.csv`.
- Requires `POST /api/ext/budsies/marketing-subscription-requests` from the companion VSF API change with the same name, and Magento #37180.
- No new dependency, storage, order-restoration mechanism, or change to `/mailing-list-subscriptions`.
